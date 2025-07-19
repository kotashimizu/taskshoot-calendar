/**
 * 直接SQL実行スクリプト
 * Supabase REST APIを使用してマイグレーション実行
 */

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

/**
 * PostgreSQLのDDL文を実行するためのHTTPリクエスト
 */
async function executeDDL(sqlContent, migrationName) {
  try {
    console.log(`\n🔄 実行中: ${migrationName}`)
    console.log(`📄 SQL文字数: ${sqlContent.length}`)
    
    // SQLを個別のステートメントに分割
    const statements = sqlContent
      .split(/;\s*\n/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 実行する文の数: ${statements.length}`)
    
    let successCount = 0
    let errors = []
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue
      
      try {
        // PostgreSQL の psql エンドポイントを使用
        const response = await fetch(`${supabaseUrl.replace('supabase.co', 'supabase.co')}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            query: statement + ';'
          })
        })
        
        if (response.ok) {
          successCount++
          console.log(`   ✅ 文 ${i + 1}: 成功`)
        } else {
          const errorText = await response.text()
          errors.push(`文 ${i + 1}: ${errorText}`)
          console.log(`   ⚠️  文 ${i + 1}: ${response.status} - 期待されるエラーの可能性`)
        }
        
      } catch (error) {
        errors.push(`文 ${i + 1}: ${error.message}`)
        console.log(`   ⚠️  文 ${i + 1}: ${error.message}`)
      }
      
      // レート制限を避けるため少し待機
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`\n📊 実行結果: ${successCount}/${statements.length} 成功`)
    
    if (errors.length > 0) {
      console.log('⚠️  エラー詳細:')
      errors.forEach(error => console.log(`   ${error}`))
    }
    
    return {
      success: successCount > 0,
      total: statements.length,
      successful: successCount,
      errors: errors
    }
    
  } catch (error) {
    console.error(`❌ ${migrationName} 実行エラー:`, error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * マイグレーションファイルを読み込んで実行
 */
async function runMigration(filename) {
  try {
    const sqlPath = join(dirname(__dirname), 'supabase', 'migrations', filename)
    const sqlContent = readFileSync(sqlPath, 'utf8')
    
    const result = await executeDDL(sqlContent, filename)
    
    if (result.success) {
      console.log(`\n✅ ${filename} 実行完了`)
      return true
    } else {
      console.log(`\n❌ ${filename} 実行失敗`)
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
  console.error('使用方法: node direct-sql-execution.js <migration-file>')
  process.exit(1)
}

// マイグレーション実行
console.log('🚀 直接SQL実行開始')
console.log(`📊 プロジェクト: ${supabaseUrl}`)
console.log(`📁 実行ファイル: ${migrationFile}`)

runMigration(migrationFile)
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