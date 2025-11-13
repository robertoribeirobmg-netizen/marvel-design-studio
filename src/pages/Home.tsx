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
  Volleyball
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [counts, setCounts] = useState({ cooperados: 0, area: 0, unidades: 0 });

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
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

  // Contador animado
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    
    const targets = { cooperados: 150, area: 42000, unidades: 96 };
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setCounts({
        cooperados: Math.floor((targets.cooperados / steps) * step),
        area: Math.floor((targets.area / steps) * step),
        unidades: Math.floor((targets.unidades / steps) * step),
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
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
    { icon: Trophy, name: 'Campo de Futebol', color: 'from-emerald-500 to-emerald-600' },
    { icon: Volleyball, name: 'Quadra de Tênis', color: 'from-blue-500 to-blue-600' },
    { icon: Waves, name: 'Piscina Adulto', color: 'from-cyan-500 to-cyan-600' },
    { icon: Heart, name: 'Piscina Infantil', color: 'from-pink-500 to-pink-600' },
    { icon: Dumbbell, name: 'Academia Completa', color: 'from-purple-500 to-purple-600' },
    { icon: Users, name: 'Espaço Kids', color: 'from-orange-500 to-orange-600' },
    { icon: HomeIcon, name: 'Salão de Festas', color: 'from-red-500 to-red-600' },
    { icon: Building2, name: 'Coworking', color: 'from-indigo-500 to-indigo-600' },
    { icon: Volleyball, name: 'Quadra de Areia', color: 'from-yellow-500 to-yellow-600' },
    { icon: Trophy, name: 'Quadra de Basquete', color: 'from-green-500 to-green-600' },
    { icon: Coffee, name: 'Bar da Piscina', color: 'from-teal-500 to-teal-600' },
    { icon: UtensilsCrossed, name: 'Restaurante', color: 'from-rose-500 to-rose-600' },
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
              <img src={logo} alt="La Felicità" className="h-8 md:h-12 w-auto group-hover:scale-105 transition-transform" />
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 animate-gradient-x" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-blob" style={{animationDelay: '2s'}} />
        
        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-bounce-subtle">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Empreendimento Exclusivo</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 text-primary">
              Residencial La Felicità
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Seu sonho de ter uma casa de praia em <span className="text-primary font-semibold">Praia do Forte</span> está mais próximo do que você imagina
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 max-w-2xl mx-auto mb-12">
              <div className="bg-card/50 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl border border-border">
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-1">
                  {counts.cooperados}+
                </div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Cooperados</div>
              </div>
              <div className="bg-card/50 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl border border-border">
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-secondary mb-1 break-words">
                  {counts.area.toLocaleString()}m²
                </div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Área Total</div>
              </div>
              <div className="bg-card/50 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl border border-border">
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-accent mb-1">
                  {counts.unidades}
                </div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Unidades</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary-hover shadow-lg shadow-primary/30 group">
                Quero Participar
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <MapPin className="mr-2 h-4 w-4" />
                Ver Localização
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
        <div className="container mx-auto">
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
        
        <div className="container mx-auto relative z-10">
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
        <div className="container mx-auto">
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
                className="group p-6 bg-card rounded-2xl border border-border hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${area.color} rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform`}>
                  <area.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm md:text-base">{area.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section id="diferenciais" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
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
        <div className="container mx-auto">
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
        <div className="container mx-auto">
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent" />
        <div className="container mx-auto relative z-10 text-center text-white">
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
