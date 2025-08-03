// frontend/src/components/Layout.jsx

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  HomeIcon, 
  HeartIcon, 
  UsersIcon, 
  MessageCircleIcon,
  PrinterIcon,
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  BellIcon,
  UserIcon
} from 'lucide-react';
import { useQuery } from 'react-query';
import { messagesAPI, announcementsAPI } from '../utils/api';

const Layout = () => {
  const { user, signOut, isCustomer, isMaker, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get unread message count
  const { data: unreadData } = useQuery(
    'unreadCount',
    () => messagesAPI.getUnreadCount(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      enabled: !!user
    }
  );

  // Get announcements
  const { data: announcementsData } = useQuery(
    'announcements',
    () => announcementsAPI.getAnnouncements(),
    {
      refetchInterval: 300000, // Refetch every 5 minutes
      enabled: !!user
    }
  );

  const unreadCount = unreadData?.data?.unreadCount || 0;
  const announcements = announcementsData?.data || [];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      {
        name: 'Profile',
        href: '/profile',
        icon: UserIcon
      },
      {
        name: 'Messages',
        href: '/messages',
        icon: MessageCircleIcon,
        badge: unreadCount > 0 ? unreadCount : null
      }
    ];

    if (isCustomer) {
      return [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: HomeIcon
        },
        {
          name: 'Favorites',
          href: '/favorites',
          icon: HeartIcon
        },
        {
          name: 'Makers',
          href: '/makers',
          icon: UsersIcon
        },
        ...baseItems
      ];
    }

    if (isMaker) {
      return [
        {
          name: 'Dashboard',
          href: '/maker/dashboard',
          icon: PrinterIcon
        },
        {
          name: 'Profile',
          href: '/maker/profile',
          icon: SettingsIcon
        },
        {
          name: 'Messages',
          href: '/maker/messages',
          icon: MessageCircleIcon,
          badge: unreadCount > 0 ? unreadCount : null
        }
      ];
    }

    if (isAdmin) {
      return [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: HomeIcon
        },
        {
          name: 'Users',
          href: '/admin/users',
          icon: UsersIcon
        },
        {
          name: 'Print Queues',
          href: '/admin/queues',
          icon: PrinterIcon
        },
        {
          name: 'Announcements',
          href: '/admin/announcements',
          icon: BellIcon
        },
        ...baseItems
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  const NavItem = ({ item, mobile = false }) => (
    <NavLink
      key={item.name}
      to={item.href}
      className={({ isActive }) =>
        `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
          isActive
            ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        } ${mobile ? 'text-base px-3 py-3' : ''}`
      }
      onClick={() => mobile && setSidebarOpen(false)}
    >
      <item.icon
        className={`${mobile ? 'mr-4 h-6 w-6' : 'mr-3 h-5 w-5'} flex-shrink-0`}
        aria-hidden="true"
      />
      {item.name}
      {item.badge && (
        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ease-linear ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
        />
        
        <div
          className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="flex items-center">
                <PrinterIcon className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">ThePrintFarm</span>
              </div>
            </div>
            <nav className="mt-8 px-4 space-y-1">
              {navItems.map((item) => (
                <NavItem key={item.name} item={item} mobile />
              ))}
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-gray-700">{user?.name}</p>
                <p className="text-sm font-medium text-gray-500 capitalize">
                  {user?.role?.toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <PrinterIcon className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">ThePrintFarm</span>
              </div>
              
              {/* Announcements */}
              {announcements.length > 0 && (
                <div className="mt-6 px-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex">
                      <BellIcon className="h-5 w-5 text-blue-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                          {announcements[0].title}
                        </h3>
                        <div className="mt-1 text-xs text-blue-700">
                          {announcements[0].content.substring(0, 100)}...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <nav className="mt-8 flex-1 px-4 space-y-1">
                {navItems.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center w-full group">
                <div className="flex-shrink-0">
                  <div className="h-9 w-9 rounded-full bg-primary-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                  <p className="text-xs font-medium text-gray-500 capitalize">
                    {user?.role?.toLowerCase()}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-3 flex-shrink-0 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <LogOutIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;