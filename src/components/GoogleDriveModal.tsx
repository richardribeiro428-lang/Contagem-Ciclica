import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  FolderOpen,
  FileSpreadsheet,
  UploadCloud,
  Trash2,
  ExternalLink,
  RefreshCw,
  LogOut,
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import {
  signInWithGoogleDrive,
  signOutGoogleDrive,
  getDriveAccessToken,
  listDriveFiles,
  getOrCreateDriveFolder,
  uploadFileToGoogleDrive,
  deleteDriveFile,
  DriveFileItem
} from '../lib/googleDriveService';
import { InventoryRecord } from '../types';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryRecords: InventoryRecord[];
  productPrices: Record<string, number>;
  skuConversions: Record<string, number>;
  showToast: (msg: string) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  inventoryRecords,
  productPrices,
  skuConversions,
  showToast,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [activeTab, setActiveTab] = useState<'sync' | 'files'>('sync');

  // Confirmation modal for deleting a file
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Check auth state
  useEffect(() => {
    async function checkAuth() {
      const token = await getDriveAccessToken();
      setHasToken(!!token);
    }
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogleDrive();
      if (result) {
        setCurrentUser(result.user);
        setHasToken(true);
        showToast(`Conectado ao Google Drive como ${result.user.displayName || result.user.email}!`);
        loadFiles();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Falha ao conectar ao Google Drive.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogleDrive();
      setCurrentUser(null);
      setHasToken(false);
      setDriveFiles([]);
      showToast('Desconectado do Google Drive.');
    } catch (err) {
      console.error(err);
      showToast('Erro ao desconectar.');
    }
  };

  const loadFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await listDriveFiles('CEVA');
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Erro ao listar arquivos:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isOpen && hasToken) {
      loadFiles();
    }
  }, [isOpen, hasToken]);

  // Upload current inventory CSV to Google Drive
  const handleUploadInventoryCsv = async () => {
    if (inventoryRecords.length === 0) {
      showToast('Nenhum registro de inventário para exportar.');
      return;
    }

    setIsUploading(true);
    try {
      const folderId = await getOrCreateDriveFolder('CEVA Inventário');

      // Generate CSV
      const headers = ['Data/Hora', 'Operador', 'Tipo Inventário', 'Depósito', 'Rua', 'Coluna', 'Nível', 'Posição', 'SKU', 'Lote', 'Qtd Peças', 'Qtd Caixas', 'Valor Unit (R$)', 'Valor Total (R$)'];
      const rows = inventoryRecords.map((rec) => [
        rec.timestamp,
        `"${rec.operator || ''}"`,
        `"${rec.inventoryType || ''}"`,
        `"${rec.deposit || ''}"`,
        `"${rec.street || ''}"`,
        `"${rec.column || ''}"`,
        `"${rec.level || ''}"`,
        `"${rec.position || ''}"`,
        `"${rec.sku || ''}"`,
        `"${rec.lot || ''}"`,
        rec.quantity,
        rec.boxCount || 0,
        (productPrices[rec.sku.toLowerCase()] || 0).toFixed(2),
        ((productPrices[rec.sku.toLowerCase()] || 0) * rec.quantity).toFixed(2),
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${now.getHours()}h${now.getMinutes()}m`;
      const fileName = `Inventario_CEVA_${dateStr}_${timeStr}.csv`;

      const uploaded = await uploadFileToGoogleDrive({
        fileName,
        content: csvContent,
        mimeType: 'text/csv; charset=utf-8',
        folderId,
      });

      showToast(`Arquivo salvo no Google Drive com sucesso na pasta "CEVA Inventário"!`);
      loadFiles();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Erro ao enviar para o Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload full system backup (JSON) to Google Drive
  const handleUploadBackupJson = async () => {
    setIsUploading(true);
    try {
      const folderId = await getOrCreateDriveFolder('CEVA Inventário');
      const backupPayload = {
        exportedAt: new Date().toISOString(),
        totalRecords: inventoryRecords.length,
        records: inventoryRecords,
        pricesCount: Object.keys(productPrices).length,
        productPrices,
        conversionsCount: Object.keys(skuConversions).length,
        skuConversions,
      };

      const jsonContent = JSON.stringify(backupPayload, null, 2);
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const fileName = `Backup_Completo_CEVA_${dateStr}.json`;

      await uploadFileToGoogleDrive({
        fileName,
        content: jsonContent,
        mimeType: 'application/json',
        folderId,
      });

      showToast(`Backup completo salvo no Google Drive com sucesso!`);
      loadFiles();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Erro ao enviar backup para o Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  // Confirm delete file from Drive (MANDATORY user confirmation)
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeletingFile(true);
    try {
      await deleteDriveFile(fileToDelete.id);
      showToast(`Arquivo "${fileToDelete.name}" excluído do Google Drive.`);
      setDriveFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Erro ao excluir arquivo.');
    } finally {
      setIsDeletingFile(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Integração com Google Drive
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                Sincronize relatórios de inventário e backups na nuvem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!hasToken ? (
            /* Sign in section */
            <div className="text-center py-8 px-4 space-y-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                <HardDrive className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-bold text-slate-800">
                  Conecte sua conta do Google Drive
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Permite exportar planilhas de inventário, relatórios de divergências e backups de forma segura diretamente para o seu Google Drive na pasta <b>CEVA Inventário</b>.
                </p>
              </div>

              {/* Standard Google Sign-In Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-300 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isSigningIn ? 'Conectando...' : 'Conectar com o Google'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                A aplicação solicitará permissão para salvar e gerenciar arquivos de inventário no seu Google Drive.
              </div>
            </div>
          ) : (
            /* Connected state */
            <div className="space-y-5">
              {/* Account Bar */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shadow-xs">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      currentUser?.displayName?.charAt(0) || 'G'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-800">
                        {currentUser?.displayName || 'Google Drive Conectado'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Ativo
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {currentUser?.email || 'Acesso liberado'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                  title="Desconectar do Google Drive"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('sync')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'sync'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Enviar para o Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('files');
                    loadFiles();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'files'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Arquivos no Drive ({driveFiles.length})</span>
                </button>
              </div>

              {activeTab === 'sync' ? (
                /* Sync actions */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Action 1: Upload Inventory CSV */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all space-y-3 shadow-2xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Exportar Inventário (CSV)
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Salva todos os <b>{inventoryRecords.length}</b> registros de contagem atual com SKUs, lotes, posições e valores calculados em planilha CSV na pasta <b>CEVA Inventário</b>.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleUploadInventoryCsv}
                      disabled={isUploading || inventoryRecords.length === 0}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Salvar Planilha no Drive</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Action 2: Upload Backup JSON */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all space-y-3 shadow-2xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Backup Completo (JSON)
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Salva um backup completo do sistema contendo todas as contagens, tabela de preços cadastrados e fatores de caixas na nuvem.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleUploadBackupJson}
                      disabled={isUploading}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4" />
                          <span>Salvar Backup no Drive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Files list from Drive */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Arquivos encontrados no seu Google Drive:
                    </span>
                    <button
                      type="button"
                      onClick={loadFiles}
                      disabled={isLoadingFiles}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                      <span>Atualizar</span>
                    </button>
                  </div>

                  {isLoadingFiles ? (
                    <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                      <span>Carregando arquivos do Google Drive...</span>
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                      Nenhum arquivo do inventário CEVA encontrado ainda no Google Drive. Use a aba "Enviar para o Drive" para criar a primeira planilha!
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {driveFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                              {file.mimeType.includes('csv') || file.mimeType.includes('spreadsheet') ? (
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Cloud className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {file.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('pt-BR') : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Abrir no Google Drive"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setFileToDelete(file)}
                              className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Excluir arquivo do Google Drive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </motion.div>

      {/* Mandatory User Confirmation Dialog for Deleting Google Drive Files */}
      <AnimatePresence>
        {fileToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Excluir arquivo do Google Drive?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Você tem certeza de que deseja remover permanentemente o arquivo{' '}
                    <b>"{fileToDelete.name}"</b> do seu Google Drive?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingFile}
                  onClick={() => setFileToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingFile}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isDeletingFile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmar Exclusão</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
