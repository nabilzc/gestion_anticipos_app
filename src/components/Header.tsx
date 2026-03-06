"use client";

import React from 'react';
import { Search, Bell, User as UserIcon } from 'lucide-react';
import styles from './Header.module.css';
import { usePathname } from 'next/navigation';

interface HeaderProps {
    user?: {
        user_metadata?: {
            full_name?: string;
            avatar_url?: string;
        };
        email?: string;
    };
}

export default function Header({ user }: HeaderProps) {
    const pathname = usePathname();

    // Map path to title
    const getTitle = (path: string) => {
        if (path === '/') return 'Dashboard';
        if (path.includes('solicitudes/nueva')) return 'Nueva Solicitud';
        if (path.includes('mis-anticipos')) return 'Mis Anticipos';
        if (path.includes('legalizaciones')) return 'Legalizaciones';
        if (path.includes('aprobaciones')) return 'Aprobaciones';
        if (path.includes('desembolsos')) return 'Desembolsos';
        if (path.includes('reportes')) return 'Reportes';
        if (path.includes('admin')) return 'Administración';
        return 'Dashboard';
    };

    return (
        <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
                <h2 className={styles.pageTitle}>{getTitle(pathname)}</h2>
            </div>
            <div className={styles.topbarRight}>
                <div className={styles.topbarSearch}>
                    <Search size={16} className={styles.searchIcon} />
                    <input type="text" placeholder="Buscar anticipo..." className={styles.searchInput} />
                </div>
                <button className={styles.notifBtn}>
                    <Bell size={20} />
                    <span className={styles.notifDot}></span>
                </button>
                <div className={styles.topbarUser}>
                    <div className={styles.userAvatarSm}>
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Avatar" className={styles.avatarImg} />
                        ) : (
                            user?.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0) : <UserIcon size={14} />
                        )}
                    </div>
                    <span className={styles.userNameSm}>{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}</span>
                </div>
            </div>
        </header>
    );
}
