#!/bin/bash

echo "🔧 SCRIPT DE INSTALACIÓN DEL SISTEMA DE NOTIFICACIONES"
echo "=================================================="

echo ""
echo "📦 Paso 1: Deteniendo servidor si está corriendo..."
# Kill any running node processes (optional)
# pkill -f "node.*index" 2>/dev/null || true

echo ""
echo "🗂️ Paso 2: Limpiando archivos de Prisma..."
rm -rf ./node_modules/.prisma 2>/dev/null || true

echo ""
echo "📋 Paso 3: Regenerando cliente de Prisma..."
npx prisma generate

echo ""
echo "🔄 Paso 4: Verificando migración..."
npx prisma migrate status

echo ""
echo "🧪 Paso 5: Verificando conexión a base de datos..."
npx prisma db pull --force 2>/dev/null || echo "Advertencia: No se pudo verificar la conexión"

echo ""
echo "🔨 Paso 6: Compilando TypeScript..."
npx tsc --noEmit

echo ""
echo "✅ INSTALACIÓN COMPLETADA"
echo ""
echo "📍 ENDPOINTS DISPONIBLES:"
echo "  GET    /api/admin/notifications"
echo "  POST   /api/admin/notifications/:id/mark-read"
echo "  POST   /api/admin/notifications/mark-all-read"
echo ""
echo "🚀 Para iniciar el servidor:"
echo "  npm run dev"
echo ""