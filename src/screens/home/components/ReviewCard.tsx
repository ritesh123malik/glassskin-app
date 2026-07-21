import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Star, ThumbsUp, ThumbsDown, Flag, ShieldCheck } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { Review } from '../../../types';
import { tokens } from '../../../theme/tokens';

type ReviewCardProps = {
  review: Review;
  currentUserId?: string;
  userVote: 'helpful' | 'not_helpful' | null;
  votingId: string | null;
  flaggingId: string | null;
  onVote: (reviewId: string, direction: 'helpful' | 'not_helpful') => void;
  onFlag: (reviewId: string) => void;
};

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review, currentUserId, userVote, votingId, flaggingId, onVote, onFlag,
}) => {
  const isVoting = votingId === review.id;
  const isFlagging = flaggingId === review.id;
  const isOwnReview = currentUserId === review.user_id;

  return (
    <GlassCard variant="float-card" style={styles.reviewCard}>
      {/* Header row: name + stars + badges */}
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUserRow}>
          <Text style={styles.reviewUser}>{review.user_name}</Text>
          {review.verified_purchase && (
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={11} color="#22C55E" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        <View style={styles.reviewStars}>
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              size={11}
              color={s <= review.rating ? '#FBBF24' : '#334155'}
              fill={s <= review.rating ? '#FBBF24' : 'transparent'}
            />
          ))}
        </View>
      </View>

      {/* Comment — sanitizeText was applied at load time */}
      <Text style={styles.reviewComment}>{review.comment}</Text>

      {/* Review photos */}
      {review.images && review.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reviewPhotoScroll}
          contentContainerStyle={styles.reviewPhotoRow}
        >
          {review.images.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={styles.reviewPhoto}
              contentFit="cover"
              cachePolicy="disk"
            />
          ))}
        </ScrollView>
      )}

      {/* Footer: date + helpful voting + flag */}
      <View style={styles.reviewFooter}>
        <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>

        <View style={styles.voteRow}>
          <Text style={styles.helpfulLabel}>Helpful?</Text>

          <TouchableOpacity
            style={[styles.voteBtn, userVote === 'helpful' && styles.voteBtnActive]}
            onPress={() => onVote(review.id, 'helpful')}
            disabled={isVoting || isOwnReview}
            id={`vote-helpful-${review.id}`}
          >
            {isVoting
              ? <ActivityIndicator size={12} color="#22C55E" />
              : <ThumbsUp size={13} color={userVote === 'helpful' ? '#22C55E' : '#6B6660'} />}
            <Text style={[styles.voteBtnText, userVote === 'helpful' && styles.voteBtnTextActive]}>
              {review.helpful_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteBtn, userVote === 'not_helpful' && styles.voteBtnNegActive]}
            onPress={() => onVote(review.id, 'not_helpful')}
            disabled={isVoting || isOwnReview}
            id={`vote-nothelpful-${review.id}`}
          >
            <ThumbsDown size={13} color={userVote === 'not_helpful' ? '#EF4444' : '#6B6660'} />
          </TouchableOpacity>

          {!isOwnReview && (
            <TouchableOpacity
              style={styles.flagBtn}
              onPress={() => onFlag(review.id)}
              disabled={isFlagging}
              id={`flag-review-${review.id}`}
            >
              {isFlagging
                ? <ActivityIndicator size={12} color="#F59E0B" />
                : <Flag size={13} color="#6B6660" />}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GlassCard>
  );
};

import { Image, ScrollView } from 'react-native';

const styles = StyleSheet.create({
  reviewCard: { padding: 16, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  reviewUserRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 6 },
  reviewUser: { color: tokens.colors.ink, fontSize: 13, fontFamily: 'Inter_500Medium' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { color: '#22C55E', fontSize: 10, fontFamily: 'Inter_500Medium' },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewComment: { color: tokens.colors.ink, opacity: 0.85, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 8 },
  reviewPhotoScroll: { marginBottom: 10 },
  reviewPhotoRow: { gap: 8 },
  reviewPhoto: { width: 80, height: 80, borderRadius: 8 },
  reviewFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  reviewDate: { color: tokens.colors.muted, fontSize: 11, fontFamily: 'Inter_400Regular' },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helpfulLabel: { color: tokens.colors.muted, fontSize: 11, fontFamily: 'Inter_400Regular' },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: tokens.colors.glass, borderWidth: 1, borderColor: tokens.colors.line },
  voteBtnActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)' },
  voteBtnNegActive: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)' },
  voteBtnText: { color: tokens.colors.muted, fontSize: 12, fontFamily: 'Inter_500Medium' },
  voteBtnTextActive: { color: '#22C55E' },
  flagBtn: { padding: 4, borderRadius: 6 },
});
