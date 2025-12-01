import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  MapPin, 
  Users, 
  Home as HomeIcon, 
  Sparkles,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  CheckCircle,
  Building2,
  Trophy,
  Shield,
  TrendingUp,
  Clock,
  Heart,
  Star,
  ChevronDown,
  Waves,
  Trees,
  Dumbbell,
  Coffee,
  UtensilsCrossed,
  Volleyball,
  Circle,
  Target,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "@/assets/logo-felicita.png";
import heroBackground from "@/assets/hero-background.png";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import campoFutebol from "@/assets/lazer/campo-futebol.jpg";
import quadraTenis from "@/assets/lazer/quadra-tenis.jpg";
import piscinaAdulto from "@/assets/lazer/piscina-adulto.jpg";
import piscinaInfantil from "@/assets/lazer/piscina-infantil.jpg";
import academia from "@/assets/lazer/academia.jpg";
import espacoKids from "@/assets/lazer/espaco-kids.jpg";
import salaoFestas from "@/assets/lazer/salao-festas.jpg";
import coworking from "@/assets/lazer/coworking.jpg";
import quadraAreia from "@/assets/lazer/quadra-areia.jpg";
import quadraBasquete from "@/assets/lazer/quadra-basquete.jpg";
import barPiscina from "@/assets/lazer/bar-piscina.jpg";
import restaurante from "@/assets/lazer/restaurante.jpg";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);

  // Scroll reveal hooks para cada seção
  const sobreReveal = useScrollReveal();
  const beneficiosReveal = useScrollReveal();
  const lazerReveal = useScrollReveal();
  const diferenciaisReveal = useScrollReveal();
  const depoimentosReveal = useScrollReveal();
  const localizacaoReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();

  // Navbar scroll effect e parallax
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolled(scrollPosition > 50);
      
      // Efeito parallax suave - move a imagem mais devagar que o scroll
      setParallaxOffset(scrollPosition * 0.3);
      
      // Detectar seção ativa
      const sections = ['sobre', 'beneficios', 'lazer', 'diferenciais', 'localizacao', 'contato'];
      const current = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const testimonials = [
    {
      name: "Maria Silva",
      role: "Professora - Cooperada",
      text: "Sempre sonhei em ter minha casa de praia. Com o programa PHSPBA e a transparência da COHAPM, esse sonho está se tornando realidade!",
      avatar: "MS"
    },
    {
      name: "João Santos",
      role: "Servidor Público",
      text: "O acompanhamento em tempo real da obra me dá total segurança. Posso ver cada etapa sendo concluída através do portal.",
      avatar: "JS"
    },
    {
      name: "Ana Costa",
      role: "Enfermeira - Cooperada",
      text: "A infraestrutura de lazer é incrível! Minha família já está ansiosa para aproveitar cada espaço do condomínio.",
      avatar: "AC"
    }
  ];

  const leisureAreas = [
    { icon: Circle, name: 'Campo de Futebol', color: 'from-accent to-success', image: campoFutebol },
    { icon: Target, name: 'Quadra de Tênis', color: 'from-warning to-secondary', image: quadraTenis },
    { icon: Waves, name: 'Piscina Adulto', color: 'from-primary to-accent', image: piscinaAdulto },
    { icon: Waves, name: 'Piscina Infantil', color: 'from-secondary to-warning', image: piscinaInfantil },
    { icon: Dumbbell, name: 'Academia Completa', color: 'from-success to-primary', image: academia },
    { icon: Users, name: 'Espaço Kids', color: 'from-warning to-accent', image: espacoKids },
    { icon: HomeIcon, name: 'Salão de Festas', color: 'from-accent to-secondary', image: salaoFestas },
    { icon: Building2, name: 'Coworking', color: 'from-primary to-success', image: coworking },
    { icon: Volleyball, name: 'Quadra de Areia', color: 'from-secondary to-warning', image: quadraAreia },
    { icon: Circle, name: 'Quadra de Basquete', color: 'from-warning to-primary', image: quadraBasquete },
    { icon: Coffee, name: 'Bar da Piscina', color: 'from-accent to-warning', image: barPiscina },
    { icon: UtensilsCrossed, name: 'Restaurante', color: 'from-success to-accent', image: restaurante },
  ];

  const differentials = [
    {
      icon: Shield,
      title: "Transparência Total",
      description: "Acompanhe cada etapa da obra em tempo real através do portal exclusivo do cooperado"
    },
    {
      icon: TrendingUp,
      title: "Valorização Garantida",
      description: "Localização privilegiada na região da Praia do Forte com alto potencial de valorização"
    },
    {
      icon: Clock,
      title: "Prazo Definido",
      description: "Cronograma estabelecido e acompanhamento rigoroso de cada fase da construção"
    },
    {
      icon: CheckCircle,
      title: "Qualidade Certificada",
      description: "Projeto arquitetônico premiado e equipe com mais de 50 anos de experiência"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-background/95 backdrop-blur-lg shadow-md' 
          : 'bg-background/80 backdrop-blur-sm'
      }`}>
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <Link to="/">
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer group">
              <img src={logo} alt="La Felicità" className="h-10 md:h-16 w-auto group-hover:scale-105 transition-transform" />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-sm md:text-xl text-foreground whitespace-nowrap">La Felicità</span>
                <p className="text-[10px] md:text-xs text-primary font-medium">Residencial</p>
              </div>
            </div>
          </Link>
          
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {[
              { href: '#sobre', label: 'Sobre' },
              { href: '#beneficios', label: 'Benefícios' },
              { href: '#lazer', label: 'Lazer' },
              { href: '#diferenciais', label: 'Diferenciais' },
              { href: '#localizacao', label: 'Localização' },
              { href: '#contato', label: 'Contato' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-all duration-200 hover:text-primary relative group whitespace-nowrap ${
                  activeSection === item.href.slice(1) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.label}
                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary transform origin-left transition-transform duration-200 ${
                  activeSection === item.href.slice(1) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button className="bg-primary hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all duration-200 text-xs md:text-sm px-3 md:px-4 h-9 md:h-10">
                <Users className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden sm:inline">Área do Cooperado</span>
                <span className="sm:hidden">Cooperado</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Image with Parallax */}
        <div 
          className="absolute inset-0 bg-center bg-no-repeat transition-transform duration-100 ease-out animate-pan-slow"
          style={{ 
            backgroundImage: `url(${heroBackground})`,
            transform: `translateY(${parallaxOffset}px)`,
            backgroundSize: 'auto 100%',
          }}
        />
        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-secondary/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-bounce-subtle border border-secondary/40">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Empreendimento Exclusivo</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl font-semibold mb-6 text-secondary" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)' }}>
              Residencial La Felicità
            </h1>
            
            <p className="text-xl md:text-2xl text-white mb-8 leading-relaxed font-normal" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2)' }}>
              Seu sonho de ter uma casa de praia em <span className="text-secondary font-semibold">Praia do Forte</span> está mais próximo do que você imagina
            </p>


            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-yellow-400 hover:bg-yellow-500 shadow-lg shadow-yellow-400/30 group text-green-700 font-semibold">
                Quero Participar
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center mt-12 animate-bounce-subtle">
            <ChevronDown className="h-8 w-8 text-primary" />
          </div>
        </div>
      </section>

      {/* Sobre Section */}
      <section id="sobre" className="py-20 px-4">
        <div ref={sobreReveal.ref} className={`container mx-auto transition-all duration-700 ${sobreReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Sobre o Projeto</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4 text-primary">Um Empreendimento Único</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Desenvolvido pela COHAPM através do programa PHSPBA, unindo qualidade, transparência e realização de sonhos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: "Programa PHSPBA",
                description: "Programa Habitacional do Servidor Público do Estado da Bahia, permitindo que você realize o sonho da casa própria"
              },
              {
                icon: Shield,
                title: "COHAPM Confiável",
                description: "Mais de 50 anos de experiência em empreendimentos habitacionais, com histórico comprovado de sucesso"
              },
              {
                icon: Heart,
                title: "Para Sua Família",
                description: "Infraestrutura completa pensada para o bem-estar e lazer de toda a família"
              }
            ].map((item, index) => (
              <div key={index} className="group p-8 bg-card rounded-2xl border border-border hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                  <item.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios PHSPBA */}
      <section id="beneficios" className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-accent/10 to-primary/10" />
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
        
        <div ref={beneficiosReveal.ref} className={`container mx-auto relative z-10 transition-all duration-700 ${beneficiosReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-secondary uppercase tracking-wider">PHSPBA</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4 text-primary">Benefícios Exclusivos</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Vantagens únicas para servidores públicos estaduais da Bahia
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {[
              { number: "01", title: "Parcelas Acessíveis", description: "Condições especiais de pagamento descontadas em folha" },
              { number: "02", title: "Sem Burocracia", description: "Processo simplificado e direto para os cooperados" },
              { number: "03", title: "Localização Premium", description: "Um dos destinos mais valorizados do litoral baiano" },
              { number: "04", title: "Acompanhamento Online", description: "Portal exclusivo para monitorar a evolução da obra" }
            ].map((benefit, index) => (
              <div key={index} className="flex gap-6 p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border hover:shadow-lg transition-all">
                <div className="text-6xl font-bold bg-gradient-to-br from-secondary to-accent bg-clip-text text-transparent opacity-30">
                  {benefit.number}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl border border-border">
            <h3 className="text-2xl font-bold mb-6 text-center">Quem Pode Participar?</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Servidores Públicos Estaduais Ativos",
                "Servidores com desconto em folha autorizado",
                "Funcionários de autarquias estaduais",
                "Pensionistas do Estado da Bahia"
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Áreas de Lazer */}
      <section id="lazer" className="py-20 px-4">
        <div ref={lazerReveal.ref} className={`container mx-auto transition-all duration-700 ${lazerReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-accent uppercase tracking-wider">Infraestrutura</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4 text-primary">Áreas de Lazer Completas</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              12 espaços projetados para o seu bem-estar e da sua família
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {leisureAreas.map((area, index) => (
              <div
                key={index}
                onClick={() => setSelectedArea(index)}
                className="group relative overflow-hidden rounded-2xl border border-border hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer aspect-square"
              >
                <img 
                  src={area.image} 
                  alt={area.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-semibold text-sm md:text-base text-white drop-shadow-lg">{area.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal de Áreas de Lazer */}
      <Dialog open={selectedArea !== null} onOpenChange={() => setSelectedArea(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedArea !== null && (
            <>
              <button
                onClick={() => setSelectedArea(null)}
                className="absolute right-4 top-4 z-10 rounded-full bg-background/80 backdrop-blur-sm p-2 hover:bg-background transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <DialogTitle className="sr-only">{leisureAreas[selectedArea].name}</DialogTitle>
              <div className="relative">
                <img
                  src={leisureAreas[selectedArea].image}
                  alt={leisureAreas[selectedArea].name}
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/70 to-transparent p-6">
                  <div className={`inline-flex items-center gap-3 mb-2`}>
                    <div className={`w-12 h-12 bg-gradient-to-br ${leisureAreas[selectedArea].color} rounded-xl flex items-center justify-center`}>
                      {(() => {
                        const IconComponent = leisureAreas[selectedArea].icon;
                        return <IconComponent className="h-6 w-6 text-white" />;
                      })()}
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">{leisureAreas[selectedArea].name}</h2>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Diferenciais */}
      <section id="diferenciais" className="py-20 px-4 bg-muted/30">
        <div ref={diferenciaisReveal.ref} className={`container mx-auto transition-all duration-700 ${diferenciaisReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Por Que Escolher</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4 text-primary">Nossos Diferenciais</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {differentials.map((diff, index) => (
              <div key={index} className="p-8 bg-card rounded-2xl border border-border hover:border-primary transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
                  <diff.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{diff.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{diff.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 px-4">
        <div ref={depoimentosReveal.ref} className={`container mx-auto transition-all duration-700 ${depoimentosReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-secondary uppercase tracking-wider">Depoimentos</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4 text-primary">O Que Dizem Nossos Cooperados</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="p-8 bg-card rounded-2xl border border-border hover:shadow-xl transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground italic mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Localização */}
      <section id="localizacao" className="py-20 px-4 bg-muted/30">
        <div ref={localizacaoReveal.ref} className={`container mx-auto transition-all duration-700 ${localizacaoReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Localização</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4 text-primary">Praia do Forte, Bahia</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Uma das regiões mais valorizadas e procuradas do litoral norte baiano
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-6">Pontos de Interesse Próximos</h3>
              <div className="space-y-4">
                {[
                  { name: "Praia do Forte (Centro)", distance: "5 km" },
                  { name: "Projeto Tamar", distance: "6 km" },
                  { name: "Castelo Garcia D'Ávila", distance: "4 km" },
                  { name: "Salvador (Aeroporto)", distance: "65 km" }
                ].map((place, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="font-medium">{place.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">{place.distance}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-2xl overflow-hidden border border-border min-h-[400px] flex items-center justify-center">
              <div className="text-center p-8">
                <MapPin className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Mapa interativo em breve</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent animate-gradient-x" />
        <div ref={ctaReveal.ref} className={`container mx-auto relative z-10 text-center text-white transition-all duration-700 ${ctaReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white">Realize Seu Sonho Hoje</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Entre em contato e descubra como você pode fazer parte do Residencial La Felicità
          </p>
          <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 shadow-2xl">
            <Phone className="mr-2 h-5 w-5" />
            Falar com Especialista
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-card border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} alt="La Felicità" className="h-10 w-auto" />
                <span className="font-bold text-lg">La Felicità</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Realizando sonhos através do programa PHSPBA
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links Rápidos</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div><a href="#sobre" className="hover:text-primary transition-colors">Sobre</a></div>
                <div><a href="#beneficios" className="hover:text-primary transition-colors">Benefícios</a></div>
                <div><a href="#lazer" className="hover:text-primary transition-colors">Lazer</a></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  (71) 3456-7890
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  contato@lafelicita.com.br
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Redes Sociais</h4>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>© 2024 Residencial La Felicità. Todos os direitos reservados. Desenvolvido por COHAPM.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
