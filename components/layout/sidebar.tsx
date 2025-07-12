'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Calendar,
  CheckSquare,
  Clock,
  Home,
  Settings,
  BarChart3
} from 'lucide-react'

const navigation = [
  {
    name: 'ダッシュボード',
    href: '/dashboard',
    icon: Home
  },
  {
    name: 'タスク管理',
    href: '/tasks',
    icon: CheckSquare
  },
  {
    name: 'カレンダー',
    href: '/calendar',
    icon: Calendar
  },
  {
    name: 'タイムトラッキング',
    href: '/time-tracking',
    icon: Clock
  },
  {
    name: 'レポート',
    href: '/reports',
    icon: BarChart3
  },
  {
    name: '設定',
    href: '/settings',
    icon: Settings
  }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col w-64 bg-gray-50 border-r border-gray-200">
      <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900">
            TaskShoot Calendar
          </h1>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-5 w-5',
                    isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}