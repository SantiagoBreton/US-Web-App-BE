# 🎮 Sistema de Gamificación "Vecino Estrella"

## 📊 Reglas de Puntos

### ✅ Acciones que Otorgan Puntos

#### 🏆 Uso Responsable de Amenidades
- **+10 pts** - Completar reserva sin cancelar
- **+15 pts** - Calificar amenidad después de usar
- **+5 pts** - Dejar calificación positiva (4-5 estrellas) - bonus
- **+10 pts** - Comentario constructivo en calificación
- **+50 pts** - 5 reservas consecutivas sin cancelaciones (racha)
- **+5 pts** - Reservar en horarios de baja demanda

#### 📢 Participación en Reclamos
- **+15 pts** - Crear reclamo constructivo
- **+5 pts** - Apoyar/rechazar reclamo de otro vecino
- **+30 pts** - Reclamo marcado como "resuelto"
- **+10 pts** - Adjuntar foto/evidencia en reclamo

#### 👥 Convivencia Social
- **+5 pts** - Primer login del día
- **+25 pts** - Completar perfil al 100% (una vez)
- **+20 pts** - Login semanal consecutivo (7 días)
- **+10 pts** - Actualizar datos de contacto

#### ⚡ Bonus Especiales
- **+100 pts** - Vecino del Mes (usuario con más puntos)
- **+50 pts** - Pionero (primeros 10 usuarios en usar nueva amenidad)
- **+75 pts** - Embajador (referir a otro vecino)

---

### ❌ Acciones que Restan Puntos

- **-40 pts** - Cancelar reserva con menos de 24hrs de anticipación
- **-45 pts** - Reclamo marcado como spam/duplicado/rechazado
- **-10 pts** - Calificación de "No adhiero" por más de 2 vecinos en 1 reclamo

---

## 🏅 Niveles de Usuario

| Nivel | Puntos Requeridos | Badge | Beneficios Estéticos |
|-------|-------------------|-------|---------------------|
| 🥉 **Bronce** | 0 - 199 | Nuevo Vecino | Badge básico gris |
| 🥈 **Plata** | 200 - 499 | Buen Vecino | Badge plateado + 1 tema + marco plateado + efecto hover |
| 🥇 **Oro** | 500 - 999 | Gran Vecino | Badge dorado + 3 temas + marco dorado animado + partículas + título |
| 💎 **Platino** | 1000 - 1999 | Vecino Ejemplar | Badge platino + 5 temas + marco animado + efecto holográfico + 2 títulos + badge en comentarios |
| 👑 **Diamante** | 2000+ | Vecino VIP | Badge diamante + temas ilimitados + marco épico + efecto arcoíris + 5 títulos + título custom + animaciones premium + trail de estrellas |

---

## 🎨 Personalización Desbloqueada por Nivel

### Temas de Color (selectedTheme)
- **Bronce**: `default`
- **Plata**: `default`, `sunset`, `ocean`
- **Oro**: + `forest`, `lavender`, `midnight`
- **Platino**: + `rose`, `aurora`, `neon`
- **Diamante**: todos + `galaxy` + `custom`

### Marcos de Avatar (selectedFrame)
- **Bronce**: `none`
- **Plata**: `silver`
- **Oro**: `gold`
- **Platino**: `platinum`
- **Diamante**: `diamond`, `legendary`

### Efectos Visuales (selectedEffect)
- **Bronce**: `none`
- **Plata**: `shimmer`
- **Oro**: `glow`
- **Platino**: `sparkle`, `particles`, `holographic`
- **Diamante**: `rainbow`, `trail`

### Títulos (selectedTitle)
- **Oro**: 1 título predefinido
- **Platino**: 2 títulos predefinidos
- **Diamante**: 5 títulos + crear título custom

---

## 🏆 Categorías de Logros

### 🎯 Reservations
- `first_reservation` - Primera Reserva (25 pts)
- `reservation_streak_5` - 5 Reservas Sin Cancelar (50 pts)
- `reservation_master_50` - Maestro de Reservas - 50 completadas (100 pts)
- `early_bird` - Madrugador - 10 reservas antes de 8am (40 pts)
- `night_owl` - Nocturno - 10 reservas después de 8pm (40 pts)

### ⭐ Ratings
- `first_rating` - Primera Calificación (15 pts)
- `rating_master_10` - Crítico Experto - 10 calificaciones (75 pts)
- `helpful_reviewer` - Reseñas Útiles - 5 comentarios constructivos (60 pts)

### 📢 Claims
- `first_claim` - Primer Reclamo (15 pts)
- `problem_solver_5` - Solucionador - 5 reclamos resueltos (100 pts)
- `community_voice` - Voz de la Comunidad - 20 adhesiones dadas (60 pts)

### 📅 Social
- `perfect_week` - Semana Perfecta - 7 días consecutivos (50 pts)
- `veteran` - Veterano - 1 año en la app (200 pts)
- `pioneer` - Pionero - Entre los primeros 50 usuarios (100 pts)
- `profile_complete` - Perfil Completo - 100% completado (25 pts)

---

## 📊 Tracking en UserGamification

### Estadísticas Registradas
```typescript
{
  totalPoints: number             
  currentLevel: string            // bronce, plata, oro, platino, diamante
  
  // Contadores para achievements
  reservationsCompleted: number   // Reservas completadas
  reservationsCancelled: number   // Cancelaciones (para tracking)
  ratingsGiven: number           // Calificaciones dadas
  claimsCreated: number          // Reclamos creados
  claimsResolved: number         // Reclamos resueltos
  claimsRejected: number         // Reclamos rechazados (spam/duplicado)
  adhesionsGiven: number         // Adhesiones dadas a reclamos
  adhesionsReceived: number      // Adhesiones recibidas
  negativeAdhesions: number      // "No adhiero" recibidos
  consecutiveDays: number        // Días consecutivos de login
  lastLoginDate: DateTime        // Última fecha de login

  selectedTheme: string          // Tema de color activo
  selectedFrame: string          // Marco de avatar activo
  selectedEffect: string         // Efecto visual activo
  selectedTitle: string?         // Título seleccionado
  customTitle: string?           // Título custom (solo diamante)
}
```

---

## 🔧 Implementación Técnica

### ✨ IMPORTANTE: Uso de Lookup Tables

El sistema ahora usa **lookup tables** para todos los datos configurables:

- `GamificationLevel` - Niveles (bronce, plata, oro, platino, diamante)
- `GamificationTheme` - Temas de color
- `GamificationFrame` - Marcos de avatar
- `GamificationEffect` - Efectos visuales
- `AchievementCategory` - Categorías de logros
- `AchievementRarity` - Rareza de logros

**Ventajas:**
- ✅ Fácil agregar nuevos niveles/temas sin cambiar código
- ✅ Metadata centralizada (colores, iconos, thresholds)
- ✅ Queries más eficientes con JOINs
- ✅ Consistencia de datos garantizada
- ✅ Administración desde base de datos

### Cálculo de Nivel Automático
```typescript
async function calculateLevel(points: number): Promise<number> {
  
  const level = await prisma.gamificationLevel.findFirst({
    where: {
      minPoints: { lte: points },
      OR: [
        { maxPoints: { gte: points } },
        { maxPoints: null } // Nivel más alto sin límite
      ]
    },
    orderBy: { order: 'desc' } // Del más alto al más bajo
  });
  
  return level?.id || 1; // Default: bronce (id: 1)
}
```

### Registro de Transacción de Puntos
Cada acción que otorga/resta puntos debe crear un `PointTransaction`:
```typescript
{
  userId: number
  points: number                 // +10, -40, etc.
  action: string                 // "reservation_completed", "late_cancellation"
  description: string            // "Completaste una reserva en Quincho"
  reservationId?: number         // Referencia opcional
  claimId?: number              // Referencia opcional
  ratingId?: number             // Referencia opcional
  createdAt: DateTime
}
```

### Verificación de Logros
Después de cada acción, verificar si se cumplió condición de achievement:
```typescript

if (userGamification.reservationsCompleted === 1) {
  await unlockAchievement(userId, 'first_reservation');
}
if (userGamification.reservationsCompleted === 5 && 
    userGamification.reservationsCancelled === 0) {
  await unlockAchievement(userId, 'reservation_streak_5');
}
```

---

## 📝 Notas de Implementación

1. **Atomicidad**: Toda actualización de puntos debe ser transaccional
2. **Histórico**: Mantener todo el histórico en `PointTransaction`
3. **Auditoría**: Facilita detectar bugs y resolver disputas
4. **Performance**: Indexar correctamente para leaderboards
5. **Migración**: Inicializar `UserGamification` para todos los usuarios existentes
6. **Notificaciones**: Enviar notificación cuando:
   - Se ganan/pierden puntos
   - Se sube de nivel
   - Se desbloquea un logro
   - Se llega al top 10 del mes

---

## 🚀 Próximos Pasos

1. ✅ Schema de Prisma creado
2. ⏳ Crear migración de base de datos
3. ⏳ Implementar servicios de gamificación
4. ⏳ Crear controllers de puntos y logros
5. ⏳ Integrar hooks en reservations/claims/ratings
6. ⏳ Desarrollar UI de dashboard de gamificación
7. ⏳ Implementar componentes visuales (badges, efectos)
8. ⏳ Crear sistema de notificaciones gamificadas
9. ⏳ Implementar leaderboard
10. ⏳ Seed inicial de achievements

---

**Última actualización**: 2025-11-17
