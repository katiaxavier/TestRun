import { useTheme } from '../context/ThemeContext';
import logoDark from '../assets/tr-logo.svg';
import logoLight from '../assets/tr-logo-light.svg';

interface BrandLogoProps {
  className?: string;
  style?: React.CSSProperties;
  /* 'auto' segue o tema; 'on-dark' força a variante para fundo escuro
     (ex.: sidebar, que permanece escura nos dois temas). */
  variant?: 'auto' | 'on-dark';
}

/* Logo da marca com variante por tema (o "TEST" claro some em fundo branco). */
export function BrandLogo({ className, style, variant = 'auto' }: BrandLogoProps) {
  const { theme } = useTheme();
  const src = variant === 'on-dark' || theme === 'dark' ? logoDark : logoLight;
  return <img src={src} alt="Testrun" className={className} style={style} />;
}
