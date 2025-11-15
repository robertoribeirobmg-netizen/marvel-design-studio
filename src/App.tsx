import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AreaCooperado from "./pages/AreaCooperado";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import PreviewImportacao from "./pages/PreviewImportacao";
import PreviewImportacaoFinanceira from "./pages/PreviewImportacaoFinanceira";
import ProcessImport from "./pages/ProcessImport";
import AdminDashboard from "./pages/AdminDashboard";
import ClienteDashboard from "./pages/ClienteDashboard";
import ImportacaoFinanceira from "./pages/ImportacaoFinanceira";
import CadastroLote from "./pages/CadastroLote";
import ImportacaoCohapm from "./pages/ImportacaoCohapm";
import CompradoresCohapm from "./pages/CompradoresCohapm";
import ImportacaoContratosCohapm from "./pages/ImportacaoContratosCohapm";
import ImportacaoParcelasCohapm from "./pages/ImportacaoParcelasCohapm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/area-cooperado"
                  element={
                    <ProtectedRoute>
                      <AreaCooperado />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute adminOnly>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/preview-importacao"
                  element={
                    <ProtectedRoute adminOnly>
                      <PreviewImportacao />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/preview-importacao-financeira"
                  element={
                    <ProtectedRoute adminOnly>
                      <PreviewImportacaoFinanceira />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/process-import"
                  element={
                    <ProtectedRoute adminOnly>
                      <ProcessImport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dashboard-parcelas"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cliente/dashboard"
                  element={
                    <ProtectedRoute>
                      <ClienteDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/importacao-financeira"
                  element={
                    <ProtectedRoute adminOnly>
                      <ImportacaoFinanceira />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cadastro-lote"
                  element={
                    <ProtectedRoute adminOnly>
                      <CadastroLote />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/importacao-cohapm"
                  element={
                    <ProtectedRoute adminOnly>
                      <ImportacaoCohapm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compradores-cohapm"
                  element={
                    <ProtectedRoute adminOnly>
                      <CompradoresCohapm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/importacao-contratos-cohapm"
                  element={
                    <ProtectedRoute adminOnly>
                      <ImportacaoContratosCohapm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/importacao-parcelas-cohapm"
                  element={
                    <ProtectedRoute adminOnly>
                      <ImportacaoParcelasCohapm />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
