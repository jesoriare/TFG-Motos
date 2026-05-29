import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MapDashboard from "@/components/MapDashboard";
import RoutesSection from "@/components/RoutesSection";
import RidersSection from "@/components/RidersSection";
import IncidentsSection from "@/components/IncidentsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <MapDashboard />
        <RoutesSection />
        <RidersSection />
        <IncidentsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
