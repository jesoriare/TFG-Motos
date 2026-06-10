import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import EditProfilePage from "./pages/EditProfilePage";
import ProfilePage from "./pages/ProfilePage";
import CrearRutaPage from "./pages/CrearRutaPage";
import RutaDetallePage from "./pages/RutaDetallePage";
import EditarRutaPage from "./pages/EditarRutaPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/perfil/editar" element={<EditProfilePage />} />
          <Route path="/perfil/:username" element={<ProfilePage />} />
          <Route path="/rutas/crear" element={<CrearRutaPage />} />
          <Route path="/rutas/:id" element={<RutaDetallePage />} />
          <Route path="/rutas/:id/editar" element={<EditarRutaPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
