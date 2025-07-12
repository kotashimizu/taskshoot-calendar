export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-500">
              © 2025 TaskShoot Calendar. All rights reserved.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="/privacy"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              プライバシーポリシー
            </a>
            <a
              href="/terms"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              利用規約
            </a>
            <span className="text-sm text-gray-400">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  )
}