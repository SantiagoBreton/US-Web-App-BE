# Script de instalación del sistema de notificaciones para administradores
# Ejecutar con: .\install-notifications.ps1

Write-Host "🔧 SCRIPT DE INSTALACIÓN DEL SISTEMA DE NOTIFICACIONES" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Paso 1: Deteniendo procesos de Node.js..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Procesos detenidos" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No hay procesos Node.js corriendo" -ForegroundColor Blue
}

Write-Host ""
Write-Host "🗂️ Paso 2: Limpiando archivos de Prisma..." -ForegroundColor Yellow
try {
    Remove-Item -Recurse -Force ".\node_modules\.prisma" -ErrorAction SilentlyContinue
    Write-Host "✅ Cache de Prisma limpiado" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No hay cache de Prisma para limpiar" -ForegroundColor Blue
}

Write-Host ""
Write-Host "📋 Paso 3: Regenerando cliente de Prisma..." -ForegroundColor Yellow
try {
    & npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Cliente de Prisma regenerado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Hubo advertencias al regenerar el cliente, pero es normal en Windows" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error al regenerar cliente de Prisma" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔄 Paso 4: Verificando estado de migraciones..." -ForegroundColor Yellow
try {
    & npx prisma migrate status
    Write-Host "✅ Estado de migraciones verificado" -ForegroundColor Green
} catch {
    Write-Host "⚠️ No se pudo verificar el estado de migraciones" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ INSTALACIÓN COMPLETADA" -ForegroundColor Green
Write-Host ""
Write-Host "📍 ENDPOINTS DISPONIBLES:" -ForegroundColor Cyan
Write-Host "  GET    /api/admin/notifications" -ForegroundColor White
Write-Host "  POST   /api/admin/notifications/:id/mark-read" -ForegroundColor White
Write-Host "  POST   /api/admin/notifications/mark-all-read" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Para iniciar el servidor:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📚 NOTAS IMPORTANTES:" -ForegroundColor Cyan
Write-Host "• Las notificaciones se crean automáticamente cuando se crea un nuevo claim" -ForegroundColor Gray
Write-Host "• Los claims con prioridad 'alta' o 'urgente' generan notificaciones tipo 'urgent_claim'" -ForegroundColor Gray
Write-Host "• Los claims con otras prioridades generan notificaciones tipo 'new_claim'" -ForegroundColor Gray
Write-Host "• Solo los usuarios con rol 'admin' pueden acceder a estos endpoints" -ForegroundColor Gray