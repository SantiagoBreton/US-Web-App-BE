-- ============================================
-- SEED DE GAMIFICACIÓN
-- Sistema "Vecino Estrella"
-- ============================================

-- 1. NIVELES DE GAMIFICACIÓN
INSERT INTO "gamification_levels" (key, "displayName", "minPoints", "maxPoints", "order", icon, color, "badgeImage") VALUES
  ('bronce', 'Nuevo Vecino', 0, 199, 1, '🥉', '#CD7F32', '/badges/bronze.svg'),
  ('plata', 'Buen Vecino', 200, 499, 2, '🥈', '#C0C0C0', '/badges/silver.svg'),
  ('oro', 'Gran Vecino', 500, 999, 3, '🥇', '#FFD700', '/badges/gold.svg'),
  ('platino', 'Vecino Ejemplar', 1000, 1999, 4, '💎', '#E5E4E2', '/badges/platinum.svg'),
  ('diamante', 'Vecino VIP', 2000, NULL, 5, '👑', '#B9F2FF', '/badges/diamond.svg')
ON CONFLICT (key) DO NOTHING;

-- 2. TEMAS DE COLOR
INSERT INTO "gamification_themes" (key, "displayName", "primaryColor", "secondaryColor", gradient, "requiredLevelId", "order", "isActive") VALUES
  -- Nivel Bronce (1)
  ('default', 'Predeterminado', '#3B82F6', '#1E40AF', 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)', 1, 0, true),
  
  -- Nivel Plata (2)
  ('sunset', 'Atardecer', '#F59E0B', '#DC2626', 'linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)', 2, 1, true),
  ('ocean', 'Océano', '#06B6D4', '#0284C7', 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)', 2, 2, true),
  
  -- Nivel Oro (3)
  ('forest', 'Bosque', '#10B981', '#059669', 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 3, 3, true),
  ('lavender', 'Lavanda', '#A78BFA', '#7C3AED', 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)', 3, 4, true),
  ('midnight', 'Medianoche', '#1E293B', '#0F172A', 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 3, 5, true),
  
  -- Nivel Platino (4)
  ('rose', 'Rosa', '#F472B6', '#EC4899', 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)', 4, 6, true),
  ('aurora', 'Aurora', '#34D399', '#3B82F6', 'linear-gradient(135deg, #34D399 0%, #3B82F6 100%)', 4, 7, true),
  ('neon', 'Neón', '#22D3EE', '#A855F7', 'linear-gradient(135deg, #22D3EE 0%, #A855F7 100%)', 4, 8, true),
  
  -- Nivel Diamante (5)
  ('galaxy', 'Galaxia', '#6366F1', '#EC4899', 'linear-gradient(135deg, #6366F1 0%, #EC4899 50%, #F59E0B 100%)', 5, 9, true)
ON CONFLICT (key) DO NOTHING;

-- 3. MARCOS DE AVATAR
INSERT INTO "gamification_frames" (key, "displayName", "cssClass", animation, "requiredLevelId", "order", "isActive") VALUES
  ('none', 'Sin Marco', 'frame-none', NULL, 1, 0, true),
  ('silver', 'Marco Plateado', 'frame-silver', 'pulse', 2, 1, true),
  ('gold', 'Marco Dorado', 'frame-gold', 'glow-pulse', 3, 2, true),
  ('platinum', 'Marco Platino', 'frame-platinum', 'shimmer', 4, 3, true),
  ('diamond', 'Marco Diamante', 'frame-diamond', 'rainbow-spin', 5, 4, true),
  ('legendary', 'Marco Legendario', 'frame-legendary', 'cosmic-glow', 5, 5, true)
ON CONFLICT (key) DO NOTHING;

-- 4. EFECTOS VISUALES
INSERT INTO "gamification_effects" (key, "displayName", "cssClass", animation, "requiredLevelId", "order", "isActive") VALUES
  ('none', 'Sin Efecto', 'effect-none', NULL, 1, 0, true),
  ('shimmer', 'Brillo', 'effect-shimmer', 'shimmer-wave', 2, 1, true),
  ('glow', 'Resplandor', 'effect-glow', 'soft-glow', 3, 2, true),
  ('sparkle', 'Chispa', 'effect-sparkle', 'sparkle-burst', 4, 3, true),
  ('particles', 'Partículas', 'effect-particles', 'floating-particles', 4, 4, true),
  ('holographic', 'Holográfico', 'effect-holographic', 'holo-shift', 4, 5, true),
  ('rainbow', 'Arcoíris', 'effect-rainbow', 'rainbow-flow', 5, 6, true),
  ('trail', 'Estelas', 'effect-trail', 'star-trail', 5, 7, true)
ON CONFLICT (key) DO NOTHING;

-- 5. TÍTULOS
INSERT INTO "gamification_titles" (key, "displayName", description, "requiredLevelId", "isActive") VALUES
  -- Nivel Oro (3)
  ('vecino_activo', 'Vecino Activo', 'Usuario comprometido con la comunidad', 3, true),
  
  -- Nivel Platino (4)
  ('guardian_comunitario', 'Guardián Comunitario', 'Resuelve problemas y ayuda a otros', 4, true),
  ('organizador_estrella', 'Organizador Estrella', 'Experto en reservas y eventos', 4, true),
  
  -- Nivel Diamante (5)
  ('leyenda_urbana', 'Leyenda Urbana', 'Referente de la comunidad', 5, true),
  ('embajador_vecinal', 'Embajador Vecinal', 'Representa lo mejor del edificio', 5, true),
  ('maestro_convivencia', 'Maestro de Convivencia', 'Ejemplo de buen vecino', 5, true),
  ('innovador_social', 'Innovador Social', 'Propone mejoras constantes', 5, true),
  ('custom', 'Título Personalizado', 'Crea tu propio título único', 5, true)
ON CONFLICT (key) DO NOTHING;

-- 6. CATEGORÍAS DE LOGROS
INSERT INTO "achievement_categories" (key, "displayName", description, icon, color, "order") VALUES
  ('reservations', 'Reservas', 'Logros relacionados con el uso de amenidades', '🏆', '#3B82F6', 0),
  ('social', 'Social', 'Logros de participación comunitaria', '👥', '#10B981', 1),
  ('ratings', 'Calificaciones', 'Logros por calificar amenidades', '⭐', '#F59E0B', 2),
  ('claims', 'Reclamos', 'Logros por reportar y resolver problemas', '📢', '#EF4444', 3)
ON CONFLICT (key) DO NOTHING;

-- 7. RAREZA DE LOGROS
INSERT INTO "achievement_rarities" (key, "displayName", color, "glowEffect", "order") VALUES
  ('common', 'Común', '#9CA3AF', 'glow-common', 0),
  ('rare', 'Raro', '#3B82F6', 'glow-rare', 1),
  ('epic', 'Épico', '#A855F7', 'glow-epic', 2),
  ('legendary', 'Legendario', '#F59E0B', 'glow-legendary', 3)
ON CONFLICT (key) DO NOTHING;

-- 8. LOGROS (ACHIEVEMENTS)
INSERT INTO "achievements" (
  key, 
  "displayName", 
  description, 
  icon, 
  "categoryId", 
  "pointsReward", 
  "rarityId", 
  "requiredCount", 
  "requiredAction", 
  "isRepeatable", 
  "isActive"
) VALUES
  -- RESERVATIONS (categoryId: 1)
  ('first_reservation', 'Primera Reserva', 'Completaste tu primera reserva', '🎯', 1, 25, 1, 1, 'complete_reservation', false, true),
  ('reservation_streak_5', '5 Sin Cancelar', 'Completaste 5 reservas sin cancelar ninguna', '🔥', 1, 50, 2, 5, 'reservation_streak', false, true),
  ('reservation_master_50', 'Maestro de Reservas', 'Completaste 50 reservas', '🏅', 1, 100, 3, 50, 'complete_reservations', false, true),
  ('early_bird', 'Madrugador', 'Hiciste 10 reservas antes de las 8am', '🌅', 1, 40, 2, 10, 'early_reservation', false, true),
  ('night_owl', 'Nocturno', 'Hiciste 10 reservas después de las 8pm', '🌙', 1, 40, 2, 10, 'night_reservation', false, true),
  
  -- RATINGS (categoryId: 2)
  ('first_rating', 'Primera Calificación', 'Dejaste tu primera calificación', '⭐', 3, 15, 1, 1, 'give_rating', false, true),
  ('rating_master_10', 'Crítico Experto', 'Dejaste 10 calificaciones', '🌟', 3, 75, 2, 10, 'give_ratings', false, true),
  ('helpful_reviewer', 'Reseñas Útiles', 'Dejaste 5 comentarios constructivos', '📝', 3, 60, 2, 5, 'helpful_comments', false, true),
  
  -- CLAIMS (categoryId: 4)
  ('first_claim', 'Primer Reclamo', 'Creaste tu primer reclamo', '📢', 4, 15, 1, 1, 'create_claim', false, true),
  ('problem_solver_5', 'Solucionador', 'Tuviste 5 reclamos resueltos', '🛠️', 4, 100, 3, 5, 'resolved_claims', false, true),
  ('community_voice', 'Voz de la Comunidad', 'Diste 20 adhesiones a reclamos', '🗣️', 4, 60, 2, 20, 'give_adhesions', false, true),
  
  -- SOCIAL (categoryId: 2)
  ('perfect_week', 'Semana Perfecta', 'Entraste 7 días consecutivos', '📅', 2, 50, 2, 7, 'consecutive_days', true, true),
  ('veteran', 'Veterano', 'Llevas 1 año en la app', '🎖️', 2, 200, 4, 365, 'days_active', false, true),
  ('pioneer', 'Pionero', 'Entre los primeros 50 usuarios', '🚀', 2, 100, 3, NULL, 'early_adopter', false, true),
  ('profile_complete', 'Perfil Completo', 'Completaste tu perfil al 100%', '✅', 2, 25, 1, NULL, 'complete_profile', false, true)
ON CONFLICT (key) DO NOTHING;

-- 9. INICIALIZAR GAMIFICACIÓN PARA USUARIOS EXISTENTES
-- Esto crea un registro en user_gamification para cada usuario que no lo tenga
INSERT INTO "user_gamification" (
  "userId",
  "totalPoints",
  "levelId",
  "selectedThemeId",
  "selectedFrameId",
  "selectedEffectId",
  "createdAt",
  "updatedAt"
)
SELECT 
  u.id,
  0,
  1, -- bronce
  1, -- tema default
  1, -- sin marco
  1, -- sin efecto
  NOW(),
  NOW()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "user_gamification" ug WHERE ug."userId" = u.id
);

-- ============================================
-- FIN DEL SEED DE GAMIFICACIÓN
-- ============================================
