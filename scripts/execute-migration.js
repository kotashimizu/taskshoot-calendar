/**
 * 単一マイグレーション実行スクリプト
 * Supabase JavaScript SDKを使用してSQL実行
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

// .env.local ファイルを読み込み
config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 環境変数チェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が不足しています')
  process.exit(1)
}

// Supabaseクライアント作成（Service Role使用）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * SQL文を実行
 */
async function executeSQL(sqlQuery) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlQuery })
    
    if (error) {
      // exec_sql関数が存在しない場合の代替手段
      throw new Error(`RPC Error: ${error.message}`)
    }
    
    return { success: true, data }
  } catch (error) {
    // 直接クエリ実行を試行
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: sqlQuery })
      })
      
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorData}`)
      }
      
      const result = await response.json()
      return { success: true, data: result }
    } catch (fetchError) {
      return { success: false, error: fetchError.message }
    }
  }
}

/**
 * マイグレーションファイルを実行
 */
async function executeMigration(filename) {
  console.log(`\n🔄 実行中: ${filename}`)
  
  try {
    const sqlPath = join(__dirname, '..', 'supabase', 'migrations', filename)
    const sqlContent = readFileSync(sqlPath, 'utf8')
    
    console.log(`📄 ファイル読み込み完了: ${sqlContent.length} 文字`)
    
    const result = await executeSQL(sqlContent)
    
    if (result.success) {
      console.log(`✅ ${filename} 実行成功`)
      return true
    } else {
      console.error(`❌ ${filename} 実行エラー:`, result.error)
      return false
    }
    
  } catch (error) {
    console.error(`❌ ${filename} ファイルエラー:`, error.message)
    return false
  }
}

// コマンドライン引数からファイル名を取得
const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('使用方法: node execute-migration.js <migration-file>')
  process.exit(1)
}

// マイグレーション実行
console.log('🚀 マイグレーション実行開始')
console.log(`📊 プロジェクト: ${supabaseUrl}`)
console.log(`📁 実行ファイル: ${migrationFile}`)

executeMigration(migrationFile)
  .then(success => {
    if (success) {
      console.log('\n🎉 マイグレーション実行完了!')
      process.exit(0)
    } else {
      console.log('\n❌ マイグレーション実行失敗')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('\n💥 予期しないエラー:', error.message)
    process.exit(1)
  })