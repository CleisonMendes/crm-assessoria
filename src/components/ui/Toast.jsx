import { createContext, useContext, useState, useCallback } from "react";
import { useT } from "../../theme/ThemeContext.jsx";

// Cria o contexto global para os Toasts
const ToastContext = createContext();

export function ToastProvider({ children }) {
  const t = useT();
  const [toasts, setToasts] = useState([]);

  // Função para adicionar um novo Toast (Some automaticamente após 3.5 segundos)
  const addToast = useCallback((msg, tipo = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, tipo }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3500);
  }, []);

  // Mapeamento de cores e ícones conforme o tipo de notificação
  const configToast = {
    success: { cor: t.green, icone: "✅" },
    error:   { cor: t.red,   icone: "❌" },
    warning: { cor: t.amber, icone: "⚠️" },
    info:    { cor: t.blue,  icone: "ℹ️" },
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Contêiner Flutuante que fica no canto inferior direito da tela */}
      <div style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        pointerEvents: "none", // Permite clicar "através" da div invisível
      }}>
        {toasts.map(toast => {
          const { cor, icone } = configToast[toast.tipo] || configToast.info;
          
          return (
            <div key={toast.id} style={{
              background: t.lt,
              borderLeft: `4px solid ${cor}`,
              border: `1px solid ${t.brd}`,
              boxShadow: "0px 8px 24px rgba(0,0,0,0.2)",
              color: t.tx,
              padding: "14px 20px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: "280px",
              pointerEvents: "auto", // A notificação em si é clicável/selecionável
              animation: "slideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards",
            }}>
              <style>
                {`
                  @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                  }
                `}
              </style>
              <span style={{ fontSize: 18 }}>{icone}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{toast.msg}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// Hook personalizado para usar o toast facilmente em qualquer arquivo
export const useToast = () => useContext(ToastContext);
