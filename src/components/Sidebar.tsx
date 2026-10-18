"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Receipt,
  HelpCircle,
  LogOut,
  User as UserIcon,
  ClipboardCheck,
  ArrowLeftRight,
  BarChart3,
  Settings2
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  user?: {
    user_metadata?: {
      full_name?: string;
      role?: string;
      avatar_url?: string;
    };
    email?: string;
    profile?: {
      role?: string;
    };
  };
  onLogout?: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Nueva Solicitud', href: '/solicitudes/nueva', icon: PlusCircle },
    { name: 'Mis Anticipos', href: '/mis-anticipos', icon: FileText },
    { name: 'Aprobaciones', href: '/aprobaciones', icon: ClipboardCheck },
    { name: 'Desembolsos', href: '/desembolsos', icon: ArrowLeftRight },
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
    { name: 'Legalizaciones', href: '/legalizaciones', icon: Receipt },
  ];

  if (user?.profile?.role === 'Administrador Global' || user?.email === 'nzapata@fundaec.org') {
      menuItems.push({ name: 'Administración', href: '/administracion', icon: Settings2 });
  }

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img
            src="/logo-fundaec.png"
            alt="FUNDAEC Logo"
            className={styles.logo}
          />
        </div>
        <span className={styles.subtitle}>Gestión Financiera</span>
      </div>

      <nav className={styles.nav}>
        <div className={styles.sectionLabel}>MENÚ PRINCIPAL</div>
        {menuItems.map((item) => {
          const Active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${Active ? styles.navItemActive : ''}`}
            >
              <item.icon className={styles.icon} size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className={styles.sectionLabel} style={{ marginTop: 'auto' }}>SOPORTE</div>
        <Link
          href="/ayuda"
          className={`${styles.navItem} ${pathname === '/ayuda' ? styles.navItemActive : ''}`}
        >
          <HelpCircle className={styles.icon} size={20} />
          <span>Ayuda</span>
        </Link>
      </nav>

      <div className={styles.footer}>
        <div className={styles.userAvatar}>
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              style={{ width: '100%', height: '100%', borderRadius: '12px' }}
            />
          ) : (
            user?.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0) : <UserIcon size={18} />
          )}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.user_metadata?.full_name || user?.email || 'Usuario'}</span>
          <span className={styles.userRole}>{user?.profile?.role || (user?.email === 'nzapata@fundaec.org' ? 'Administrador Global' : user?.user_metadata?.role) || 'Empleado'}</span>
        </div>
        <button
          className={styles.logoutBtn}
          onClick={onLogout}
          title="Cerrar Sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
