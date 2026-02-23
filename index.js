// Entry point for production deployment
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

// Function to generate hash of schema.prisma file
function getSchemaHash() {
  try {
    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    return crypto.createHash('md5').update(schemaContent).digest('hex');
  } catch (error) {
    console.log('⚠️ Could not read schema.prisma, will run migration');
    return null;
  }
}

// Function to check if database migration is needed
async function shouldRunMigration() {
  try {
    const currentHash = getSchemaHash();
    if (!currentHash) return true; // If can't read schema, run migration
    
    const hashFilePath = path.join(__dirname, '.schema-hash');
    
    // Check if hash file exists
    if (!fs.existsSync(hashFilePath)) {
      console.log('� First deployment detected - running database setup');
      return true;
    }
    
    // Read stored hash
    const storedHash = fs.readFileSync(hashFilePath, 'utf8').trim();
    
    if (currentHash !== storedHash) {
      console.log('🔄 Schema changes detected - running database migration');
      return true;
    }
    
    console.log('✅ No schema changes detected - skipping database migration');
    return false;
    
  } catch (error) {
    console.log('⚠️ Error checking schema changes, running migration to be safe:', error.message);
    return true;
  }
}

// Function to save current schema hash
function saveSchemaHash() {
  try {
    const currentHash = getSchemaHash();
    if (currentHash) {
      const hashFilePath = path.join(__dirname, '.schema-hash');
      fs.writeFileSync(hashFilePath, currentHash);
      console.log('💾 Schema hash saved for future comparisons');
    }
  } catch (error) {
    console.log('⚠️ Could not save schema hash:', error.message);
  }
}

async function startApp() {
  try {
    const needsMigration = await shouldRunMigration();
    
    if (needsMigration) {
      console.log('🔄 Running database schema migration...');
      
      // Execute prisma db push only when needed
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      
      console.log('✅ Database schema updated successfully');
      
      // Save current schema hash for future comparisons
      saveSchemaHash();
    } else {
      console.log('⚡ Skipping database migration - starting app directly');
    }
    
    // Load the compiled JavaScript output
    require('./dist/index.js');
    
  } catch (error) {
    console.error('❌ App startup failed:', error);
    process.exit(1);
  }
}

startApp();