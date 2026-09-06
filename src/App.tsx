import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TelaInicial } from './components/TelaInicial';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ContagensView } from './components/ContagensView';
import { GraficosView } from './components/GraficosView';
import { ContagemExecucaoView } from './components/ContagemExecucaoView';
import { NovaContagemModal } from './components/NovaContagemModal';
import { DetalhesContagemModal } from './components/DetalhesContagemModal';
import { EntradaCelularContagens } from './components/EntradaCelularContagens';
import { ImportarValoresView } from './components/ImportarValoresView';
import { ConversaoCaixasView } from './components/ConversaoCaixasView';
import { CustomCopyMenu } from './components/CustomCopyMenu';
import { INITIAL_ITEMS, INITIAL_SESSIONS } from './mockData';
import { CountSession, InventoryItem, ProductPrice, SkuConversion } from './types';
import { CheckCircle2, UserCheck } from 'lucide-react';
import {
  subscribeToSessions,
  fetchSessionsDirectly,
  saveSessionToFirestore,
  deleteSessionFromFirestore,
  subscribeToInventoryTypes,
  addInventoryTypeToFirestore,
  subscribeToProductPrices,
  saveProductPricesBatch,
  deleteProductPriceFromFirestore,
  clearAllProductPricesFromFirestore,
  subscribeToSkuConversions,
  saveSkuConversionsBatch,
  deleteSkuConversionFromFirestore,
  clearAllSkuConversionsFromFirestore,
  DEFAULT_INVENTORY_TYPES,
  DEFAULT_PRODUCT_PRICES,
  DEFAULT_SKU_CONVERSIONS
} from './lib/inventoryService';

export default function App() {
  // Navigation mode: 'portal' (Tela Inicial) | 'mobile_contagem' (Entrada do Celular) | 'admin' (Painel PC) | 'counting' (Execução da Contagem)
  // Restores previously open mode (e.g. mobile_contagem on phone) so page reloads stay on the correct screen
  const [currentMode, setCurrentMode] = useState<'portal' | 'mobile_contagem' | 'admin' | 'counting'>(() => {
    try {
      const saved = localStorage.getItem('ceva_current_mode');
      if (saved && ['portal', 'mobile_contagem', 'admin'].includes(saved)) {
        return saved as 'portal' | 'mobile_contagem' | 'admin';
      }
    } catch (e) {
      console.error(e);
    }
    return 'portal';
  });
  const [returnMode, setReturnMode] = useState<'admin' | 'mobile_contagem'>('mobile_contagem');

  // Sub-view inside Administração (PC): 'dashboard' | 'contagens' | 'graficos' | 'valores' | 'conversoes'
  const [adminView, setAdminView] = useState<'dashboard' | 'contagens' | 'graficos' | 'valores' | 'conversoes'>('dashboard');

  // Active session being counted in physical counting view - restored from localStorage if browser reloaded
  const [activeCountingSession, setActiveCountingSession] = useState<CountSession | null>(() => {
    try {
      const saved = localStorage.getItem('ceva_active_counting_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Active operator identifier
  const [currentOperator, setCurrentOperator] = useState<string | null>(() => {
    return localStorage.getItem('ceva_active_operator') || null;
  });

  // Sessions state (synced with Firestore)
  const [sessions, setSessions] = useState<CountSession[]>(() => {
    try {
      const saved = localStorage.getItem('ceva_inventory_sessions');
      if (saved) {
        const parsed: CountSession[] = JSON.parse(saved);
        return parsed.map((s) => ({
          ...s,
          status: s.status === 'Divergência' ? 'Concluída' : s.status,
        }));
      }
      return INITIAL_SESSIONS;
    } catch {
      return INITIAL_SESSIONS;
    }
  });

  // Inventory types state (synced with Firestore)
  const [availableInventoryTypes, setAvailableInventoryTypes] = useState<string[]>(DEFAULT_INVENTORY_TYPES);

  // Product prices map: SKU -> Unit Price R$ (synced with Firestore)
  const [productPrices, setProductPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    DEFAULT_PRODUCT_PRICES.forEach((p) => {
      map[p.sku.toLowerCase()] = p.unitPrice;
    });
    return map;
  });

  // SKU conversions map: SKU -> Pieces per Box (synced with Firestore)
  const [skuConversions, setSkuConversions] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    DEFAULT_SKU_CONVERSIONS.forEach((c) => {
      map[c.sku.toLowerCase()] = c.piecesPerBox;
    });
    return map;
  });

  // Base items catalog
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('ceva_inventory_items');
      return saved ? JSON.parse(saved) : INITIAL_ITEMS;
    } catch {
      return INITIAL_ITEMS;
    }
  });

  const [currentHub, setCurrentHub] = useState('CD Louveira - HUB 04');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<CountSession | null>(null);

  // Sync state & toasts
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Banco de dados ativo');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Operator Prompt Modal
  const [isPromptOperatorOpen, setIsPromptOperatorOpen] = useState(false);
  const [promptOperatorInput, setPromptOperatorInput] = useState('');

  // 1. Subscribe to Firestore Sessions
  useEffect(() => {
    const unsubscribe = subscribeToSessions((updatedSessions) => {
      if (Array.isArray(updatedSessions)) {
        setSessions(updatedSessions);
        try {
          localStorage.setItem('ceva_inventory_sessions', JSON.stringify(updatedSessions));
        } catch (e) {
          console.error(e);
        }
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setLastSyncTime(`Atualizado às ${timeStr}`);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Firestore Inventory Types
  useEffect(() => {
    const unsubscribe = subscribeToInventoryTypes((types) => {
      if (types && types.length > 0) {
        setAvailableInventoryTypes(types);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Firestore Product Prices
  useEffect(() => {
    const unsubscribe = subscribeToProductPrices((pricesMap) => {
      if (pricesMap) {
        setProductPrices(pricesMap);
      }
    });
    return () => unsubscribe();
  }, []);

  // 4. Subscribe to Firestore Sku Conversions (Peças por Caixa)
  useEffect(() => {
    const unsubscribe = subscribeToSkuConversions((conversionsMap) => {
      if (conversionsMap) {
        setSkuConversions(conversionsMap);
      }
    });
    return () => unsubscribe();
  }, []);

  // Persist current operator
  useEffect(() => {
    if (currentOperator) {
      localStorage.setItem('ceva_active_operator', currentOperator);
    } else {
      localStorage.removeItem('ceva_active_operator');
    }
  }, [currentOperator]);

  // Persist current navigation mode so browser refresh keeps the user on the same screen (e.g. mobile_contagem on phone)
  useEffect(() => {
    try {
      if (currentMode && currentMode !== 'counting') {
        localStorage.setItem('ceva_current_mode', currentMode);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentMode]);

  // Ensure fullscreen is completely exited on mount
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Real synchronization: queries Firestore directly from server and pulls new contagens
  const handleForceSync = async (forceFullReload = false) => {
    if (forceFullReload) {
      window.location.reload();
      return;
    }

    setIsSyncing(true);
    try {
      const freshSessions = await fetchSessionsDirectly();
      if (Array.isArray(freshSessions)) {
        setSessions(freshSessions);
        try {
          localStorage.setItem('ceva_inventory_sessions', JSON.stringify(freshSessions));
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error('Erro ao sincronizar contagens diretamente:', err);
      window.location.reload();
    } finally {
      setIsSyncing(false);
    }
  };

  // Called when user clicks "Startar Contagem" in NovaContagemModal
  const handleCreateSession = async (newSession: CountSession) => {
    // Update local state immediately
    setSessions((prev) => [newSession, ...prev]);

    // Save to Firestore
    try {
      await saveSessionToFirestore(newSession);
    } catch (e) {
      console.error('Failed to save session to Firestore', e);
    }

    // Set operator to the session responsible if not set
    if (!currentOperator && newSession.responsible) {
      setCurrentOperator(newSession.responsible);
    }

    // Navigate to Contagens tab as requested
    setCurrentMode('admin');
    setAdminView('contagens');
    showToast(`Contagem "${newSession.name}" criada com sucesso!`);
  };

  const handleDeleteSession = async (sessionId: string) => {
    // Local state update
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));

    if (selectedSessionForDetails?.id === sessionId) {
      setSelectedSessionForDetails(null);
    }
    if (activeCountingSession?.id === sessionId) {
      setActiveCountingSession(null);
      setCurrentMode('admin');
    }

    // Firestore deletion
    try {
      await deleteSessionFromFirestore(sessionId);
    } catch (e) {
      console.error('Failed to delete session from Firestore', e);
    }

    showToast('Contagem excluída com sucesso.');
  };

  const handleUpdateSessionStatus = async (
    sessionId: string,
    newStatus: CountSession['status']
  ) => {
    const updated = sessions.find((s) => s.id === sessionId);
    if (!updated) return;

    // When marking as Concluída, ensure all items are marked as counted
    const finalizedItems = newStatus === 'Concluída'
      ? updated.items.map((it) => ({
          ...it,
          countedQty: it.countedQty !== undefined && it.countedQty > 0 ? it.countedQty : (it.status === 'ok' ? it.expectedQty : it.countedQty || 0),
          status: (it.status === 'pending' || !it.status ? ((it.countedQty || 0) === (it.expectedQty || 0) ? 'ok' : 'divergent') : it.status) as InventoryItem['status'],
        }))
      : updated.items;

    const totalCounted = finalizedItems.reduce((acc, it) => acc + (it.countedQty || 0), 0);
    const totalExpected = finalizedItems.reduce((acc, it) => acc + (it.expectedQty || 0), 0);
    const accuracy =
      totalExpected > 0
        ? Math.min(100, Math.round((Math.min(totalCounted, totalExpected) / totalExpected) * 100))
        : 100;

    const newObj: CountSession = {
      ...updated,
      status: newStatus,
      items: finalizedItems,
      accuracy,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? newObj : s))
    );

    if (selectedSessionForDetails?.id === sessionId) {
      setSelectedSessionForDetails(newObj);
    }

    try {
      await saveSessionToFirestore(newObj);
    } catch (e) {
      console.error('Error updating session status in Firestore:', e);
    }

    try {
      const updatedList = sessions.map((s) => (s.id === sessionId ? newObj : s));
      localStorage.setItem('ceva_inventory_sessions', JSON.stringify(updatedList));
    } catch (e) {
      console.error('Error updating session status in localStorage:', e);
    }

    if (newStatus === 'Concluída') {
      showToast(`Contagem "${newObj.name}" finalizada e concluída com sucesso!`);
    } else {
      showToast(`Status atualizado para "${newStatus}".`);
    }
  };

  // Start physical counting interface for a given session (with option to resume)
  const handleStartCounting = (session: CountSession, source: 'admin' | 'mobile_contagem' = 'admin') => {
    setActiveCountingSession(session);
    try {
      localStorage.setItem('ceva_active_counting_session', JSON.stringify(session));
    } catch (e) {
      console.error(e);
    }
    setReturnMode(source);
    setCurrentMode('counting');
  };

  // Save count from ContagemExecucaoView (preserves pause/resume position & conversions)
  const handleSaveCountFromExecution = async (
    sessionId: string,
    updatedItems: InventoryItem[],
    newStatus: CountSession['status'],
    lastIndex?: number
  ) => {
    const existing = sessions.find((s) => s.id === sessionId) || activeCountingSession;
    if (!existing) return;

    const totalCounted = updatedItems.reduce((acc, it) => acc + (it.countedQty || 0), 0);
    const totalExpected = updatedItems.reduce((acc, it) => acc + (it.expectedQty || 0), 0);
    const accuracy =
      totalExpected > 0
        ? Math.min(100, Math.round((Math.min(totalCounted, totalExpected) / totalExpected) * 100))
        : 100;

    const updatedSessionObj: CountSession = {
      ...existing,
      items: updatedItems,
      status: newStatus,
      accuracy,
      lastPositionIndex: lastIndex !== undefined ? lastIndex : existing.lastPositionIndex,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? updatedSessionObj : s))
    );

    if (activeCountingSession?.id === sessionId) {
      setActiveCountingSession(updatedSessionObj);
    }

    if (selectedSessionForDetails?.id === sessionId) {
      setSelectedSessionForDetails(updatedSessionObj);
    }

    // Persist active counting session so reloading browser NEVER loses the count
    try {
      if (newStatus === 'Concluída') {
        localStorage.removeItem('ceva_active_counting_session');
      } else {
        localStorage.setItem('ceva_active_counting_session', JSON.stringify(updatedSessionObj));
      }
    } catch (e) {
      console.error('LocalStorage error:', e);
    }

    // Direct Cloud Save to Firestore - ALWAYS executed first
    try {
      await saveSessionToFirestore(updatedSessionObj);
    } catch (e) {
      console.error('Failed to save execution to Firestore', e);
    }

    // Local cache
    try {
      const updatedList = sessions.map((s) => (s.id === sessionId ? updatedSessionObj : s));
      localStorage.setItem('ceva_inventory_sessions', JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to cache sessions locally', e);
    }

    if (newStatus === 'Concluída') {
      showToast(`Contagem "${updatedSessionObj.name}" finalizada como Concluída!`);
    } else if (newStatus === 'Pendente') {
      showToast(`Contagem mantida como Pendente.`);
    }
  };

  // Add new inventory type
  const handleAddNewInventoryType = async (typeName: string) => {
    const clean = typeName.trim();
    if (!clean) return;
    setAvailableInventoryTypes((prev) => Array.from(new Set([...prev, clean])));
    try {
      await addInventoryTypeToFirestore(clean);
      showToast(`Tipo de inventário "${clean}" adicionado ao banco de dados.`);
    } catch (e) {
      console.error('Failed to add inventory type', e);
    }
  };

  // Save product prices batch from Excel
  const handleSaveProductPrices = async (prices: ProductPrice[]) => {
    await saveProductPricesBatch(prices);
    const newMap = { ...productPrices };
    prices.forEach((p) => {
      newMap[p.sku.toLowerCase()] = p.unitPrice;
    });
    setProductPrices(newMap);
    showToast(`${prices.length} preços atualizados no banco de dados!`);
  };

  // Clear all product prices
  const handleClearAllProductPrices = async () => {
    try {
      await clearAllProductPricesFromFirestore();
      setProductPrices({});
      showToast('Todos os valores de SKUs foram apagados do banco de dados.');
    } catch (e) {
      console.error('Erro ao apagar valores:', e);
      showToast('Erro ao apagar valores do banco de dados.');
    }
  };

  // Delete single product price
  const handleDeleteProductPrice = async (sku: string) => {
    try {
      await deleteProductPriceFromFirestore(sku);
      const copy = { ...productPrices };
      delete copy[sku.toLowerCase()];
      setProductPrices(copy);
      showToast(`SKU ${sku} removido da tabela de preços.`);
    } catch (e) {
      console.error('Erro ao deletar SKU:', e);
      showToast('Erro ao remover SKU do banco de dados.');
    }
  };

  // Save SKU conversions batch from Excel (peças por caixa)
  const handleSaveSkuConversions = async (conversions: SkuConversion[]) => {
    await saveSkuConversionsBatch(conversions);
    const newMap = { ...skuConversions };
    conversions.forEach((c) => {
      newMap[c.sku.toLowerCase()] = c.piecesPerBox;
    });
    setSkuConversions(newMap);
    showToast(`${conversions.length} regras de peças/caixa atualizadas no banco de dados!`);
  };

  // Clear all SKU conversions
  const handleClearAllSkuConversions = async () => {
    try {
      await clearAllSkuConversionsFromFirestore();
      setSkuConversions({});
      showToast('Todas as regras de caixas/peças foram apagadas do banco de dados.');
    } catch (e) {
      console.error('Erro ao apagar conversões:', e);
      showToast('Erro ao apagar conversões do banco de dados.');
    }
  };

  // Delete single SKU conversion
  const handleDeleteSkuConversion = async (sku: string) => {
    try {
      await deleteSkuConversionFromFirestore(sku);
      const copy = { ...skuConversions };
      delete copy[sku.toLowerCase()];
      setSkuConversions(copy);
      showToast(`SKU ${sku} removido da tabela de conversão.`);
    } catch (e) {
      console.error('Erro ao deletar conversão:', e);
      showToast('Erro ao remover SKU do banco de dados.');
    }
  };

  // Handle entry from Portal to Contagens with operator request
  const handleSelectColetorFromPortal = () => {
    if (!currentOperator) {
      setIsPromptOperatorOpen(true);
    } else {
      setCurrentMode('admin');
      setAdminView('contagens');
    }
  };

  const handleConfirmPromptOperator = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setCurrentOperator(clean);
    setIsPromptOperatorOpen(false);
    setPromptOperatorInput('');
    setCurrentMode('admin');
    setAdminView('contagens');
    showToast(`Bem-vindo, ${clean}! Exibindo suas contagens vinculadas.`);
  };

  const activeCountsCount = sessions.filter((s) => s.status === 'Em Andamento').length;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col antialiased">
      {/* 1. TELA INICIAL (Portal de Escolha) */}
      {currentMode === 'portal' && (
        <TelaInicial
          onSelectAdmin={() => {
            setCurrentMode('admin');
            setAdminView('dashboard');
          }}
          onSelectColetor={() => {
            setCurrentMode('mobile_contagem');
          }}
          activeCountsCount={activeCountsCount}
          onRefresh={() => handleForceSync(false)}
          isSyncing={isSyncing}
        />
      )}

      {/* 2. ENTRADA EXCLUSIVA DE CONTAGEM NO CELULAR / COLETOR */}
      {currentMode === 'mobile_contagem' && (
        <EntradaCelularContagens
          sessions={sessions}
          currentOperator={currentOperator}
          onSetCurrentOperator={(op) => {
            setCurrentOperator(op);
            if (op) {
              try {
                localStorage.setItem('ceva_active_operator', op);
              } catch (e) {
                console.error(e);
              }
            } else {
              localStorage.removeItem('ceva_active_operator');
            }
          }}
          onStartCounting={(sess) => handleStartCounting(sess, 'mobile_contagem')}
          onBackToHome={() => setCurrentMode('portal')}
          onOpenDetailsModal={(sess) => setSelectedSessionForDetails(sess)}
          onUpdateStatus={handleUpdateSessionStatus}
          onRefresh={() => handleForceSync(false)}
          onReloadPage={() => handleForceSync(true)}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
        />
      )}

      {/* 3. EXECUÇÃO DA CONTAGEM FÍSICA (com suporte a retomar contagem e conversão de caixas) */}
      {currentMode === 'counting' && activeCountingSession && (
        <ContagemExecucaoView
          session={activeCountingSession}
          skuConversions={skuConversions}
          onBack={() => {
            try {
              localStorage.removeItem('ceva_active_counting_session');
            } catch (e) {
              console.error(e);
            }
            setCurrentMode(returnMode);
            if (returnMode === 'admin') {
              setAdminView('contagens');
            }
          }}
          onSaveCount={handleSaveCountFromExecution}
        />
      )}

      {/* 4. ADMINISTRAÇÃO (PC) - Dashboard, Contagens e Gráficos */}
      {currentMode === 'admin' && (
        <div className="flex flex-1">
          {/* Sidebar Navigation */}
          <Sidebar
            currentView={adminView}
            onSelectView={(v) => setAdminView(v)}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            contagensCount={sessions.length}
            onOpenMobileEntry={() => setCurrentMode('mobile_contagem')}
          />

          {/* Main Layout */}
          <div className="lg:pl-64 flex flex-col flex-1 w-full min-w-0">
            {/* Header */}
            <Header
              onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              onForceSync={handleForceSync}
              isSyncing={isSyncing}
              lastSyncTime={lastSyncTime}
              onOpenMobileEntry={() => setCurrentMode('mobile_contagem')}
            />

            {/* Views in PC Admin with Smooth Tab Transitions */}
            <main className="pt-16 flex-1 pb-12 overflow-hidden">
              <AnimatePresence mode="wait">
                {adminView === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <DashboardView
                      sessions={sessions}
                      onOpenNewSessionModal={() => setIsNewSessionModalOpen(true)}
                      onOpenDetailsModal={(sess) => setSelectedSessionForDetails(sess)}
                      onDeleteSession={handleDeleteSession}
                      onStartCounting={(s) => handleStartCounting(s, 'admin')}
                      onNavigateToContagens={() => setAdminView('contagens')}
                    />
                  </motion.div>
                )}

                {adminView === 'contagens' && (
                  <motion.div
                    key="contagens"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ContagensView
                      sessions={sessions}
                      currentOperator={currentOperator}
                      onSetCurrentOperator={setCurrentOperator}
                      onOpenNewSessionModal={() => setIsNewSessionModalOpen(true)}
                      onOpenDetailsModal={(sess) => setSelectedSessionForDetails(sess)}
                      onDeleteSession={handleDeleteSession}
                      onUpdateStatus={handleUpdateSessionStatus}
                      onStartCounting={(s) => handleStartCounting(s, 'admin')}
                    />
                  </motion.div>
                )}

                {adminView === 'graficos' && (
                  <motion.div
                    key="graficos"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <GraficosView
                      sessions={sessions}
                      productPrices={productPrices}
                      skuConversions={skuConversions}
                      availableTypes={availableInventoryTypes}
                      onSaveProductPrices={handleSaveProductPrices}
                      onSaveSkuConversions={handleSaveSkuConversions}
                    />
                  </motion.div>
                )}

                {adminView === 'valores' && (
                  <motion.div
                    key="valores"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ImportarValoresView
                      productPrices={productPrices}
                      onSaveProductPrices={handleSaveProductPrices}
                      onClearAllPrices={handleClearAllProductPrices}
                      onDeletePrice={handleDeleteProductPrice}
                      showToast={showToast}
                    />
                  </motion.div>
                )}

                {adminView === 'conversoes' && (
                  <motion.div
                    key="conversoes"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ConversaoCaixasView
                      skuConversions={skuConversions}
                      onSaveSkuConversions={handleSaveSkuConversions}
                      onClearAllConversions={handleClearAllSkuConversions}
                      onDeleteConversion={handleDeleteSkuConversion}
                      showToast={showToast}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>
        </div>
      )}

      {/* Modal: Nova Contagem (adicionar tipos, caixas/peças e responsável) */}
      <NovaContagemModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        availableItems={items}
        availableInventoryTypes={availableInventoryTypes}
        onAddNewInventoryType={handleAddNewInventoryType}
        onCreateSession={handleCreateSession}
      />

      {/* Modal: Detalhes da Contagem */}
      <DetalhesContagemModal
        session={selectedSessionForDetails}
        onClose={() => setSelectedSessionForDetails(null)}
        onUpdateStatus={handleUpdateSessionStatus}
      />

      {/* Menu Corporativo Flutuante de Cópia (Elimina o menu do Google no celular ao clicar e segurar) */}
      <CustomCopyMenu />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-3 duration-200 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
