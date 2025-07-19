#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectDatabase() {
  console.log('🔍 Supabaseデータベース構造調査開始...\n');

  try {
    // 各テーブルの存在確認とカラム情報の推測
    const targetTables = [
      'profiles',
      'categories', 
      'tasks',
      'google_calendar_configs',
      'sync_logs',
      'google_event_sync',
      'time_estimates',
      'time_records',
      'time_estimate_history'
    ];

    console.log('📋 テーブル存在確認...\n');

    const existingTables = [];

    for (const tableName of targetTables) {
      console.log(`🔍 テーブル "${tableName}" の確認:`);
      
      // テーブルが存在するかまず確認
      const { data: testData, error: testError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);

      if (testError) {
        if (testError.code === '42P01') {
          console.log(`❌ テーブル "${tableName}" は存在しません`);
          console.log(`   エラー: ${testError.message}`);
        } else {
          console.log(`❌ テーブル "${tableName}" の確認エラー: ${testError.message}`);
        }
      } else {
        console.log(`✅ テーブル "${tableName}" は存在します`);
        existingTables.push(tableName);
        
        // 1件のサンプルデータを取得してカラム構造を推測
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (sampleError) {
          console.log(`   ⚠️  データ取得エラー: ${sampleError.message}`);
        } else {
          if (sampleData && sampleData.length > 0) {
            console.log('   📋 カラム構造（サンプルデータから推測）:');
            const sampleRow = sampleData[0];
            Object.keys(sampleRow).forEach(columnName => {
              const value = sampleRow[columnName];
              const type = value === null ? 'null' : typeof value;
              console.log(`     - ${columnName}: ${type} (例: ${JSON.stringify(value)})`);
            });
          } else {
            console.log('   📋 テーブルは空です');
          }
          
          // user_idまたは類似のカラムがあるかチェック
          if (sampleData && sampleData.length > 0) {
            const columns = Object.keys(sampleData[0]);
            const userIdColumn = columns.find(col => 
              col.includes('user') || 
              col.includes('auth') ||
              (col === 'id' && tableName === 'profiles')
            );
            
            if (userIdColumn) {
              console.log(`   🎯 ユーザー識別カラム: ${userIdColumn}`);
            } else {
              console.log('   ⚠️  ユーザー識別カラムが見つかりません');
            }
          }
        }
      }
      console.log('');
    }

    // 型定義ファイルとの比較分析
    console.log('🔄 型定義ファイルとの比較分析...\n');
    console.log('型定義ファイル (types/database.ts) で定義されているテーブル:');
    const typedTables = [
      'google_calendar_configs',
      'sync_logs', 
      'google_event_sync',
      'profiles',
      'categories',
      'tasks'
    ];
    
    typedTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });

    console.log('\n🎯 発見事項:');
    console.log(`  - 存在するテーブル数: ${existingTables.length}`);
    console.log(`  - 型定義で定義されたテーブル数: ${typedTables.length}`);
    
    const missingTables = typedTables.filter(table => !existingTables.includes(table));
    if (missingTables.length > 0) {
      console.log(`  - 欠けているテーブル: ${missingTables.join(', ')}`);
    }

    // Auth情報の確認
    console.log('\n🔐 認証情報の確認...');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.log(`❌ 認証状態確認エラー: ${authError.message}`);
      } else {
        console.log(`✅ 認証状態: ${authData.user ? 'ログイン済み' : 'ログアウト状態'}`);
        if (authData.user) {
          console.log(`   ユーザーID: ${authData.user.id}`);
          console.log(`   メール: ${authData.user.email}`);
        }
      }
    } catch (authError) {
      console.log(`❌ 認証確認エラー: ${authError.message}`);
    }

  } catch (error) {
    console.error('💥 データベース調査中にエラーが発生:', error);
  }
}

inspectDatabase();