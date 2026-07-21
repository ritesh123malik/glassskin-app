import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Review } from '../../../types';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';
import { ReviewCard } from './ReviewCard';

type Props = {
  reviews: Review[];
  reviewsLoading: boolean;
  isVerifiedBuyer: boolean | null;
  onWriteReview: () => void;
  onVote: (reviewId: string, direction: 'helpful' | 'not_helpful') => void;
  onFlag: (reviewId: string) => void;
  userVotes: Record<string, 'helpful' | 'not_helpful'>;
  votingId: string | null;
  flaggingId: string | null;
  currentUserId?: string;
};

export const ReviewsSection = ({
  reviews,
  reviewsLoading,
  isVerifiedBuyer,
  onWriteReview,
  onVote,
  onFlag,
  userVotes,
  votingId,
  flaggingId,
  currentUserId,
}: Props) => {
  return (
    <View>
      <View style={styles.reviewsHeaderRow}>
        <Text style={styles.reviewsTitle}>Customer Reviews ({reviews.length})</Text>
        <TouchableOpacity
          id="write-review-btn"
          onPress={onWriteReview}
          style={[
            styles.writeReviewBtn,
            isVerifiedBuyer === false && styles.writeReviewBtnDisabled,
          ]}
        >
          <Text style={[
            styles.writeReviewLink,
            isVerifiedBuyer === false && styles.writeReviewLinkDisabled,
          ]}>
            {isVerifiedBuyer === false ? 'Purchase Required' : 'Write Review'}
          </Text>
        </TouchableOpacity>
      </View>

      {reviewsLoading ? (
        <ActivityIndicator color="#8E5D34" style={{ marginVertical: 20 }} />
      ) : reviews.length === 0 ? (
        <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
      ) : (
        reviews.map(rev => (
          <ReviewCard
            key={rev.id}
            review={rev}
            currentUserId={currentUserId}
            userVote={userVotes[rev.id] ?? null}
            votingId={votingId}
            flaggingId={flaggingId}
            onVote={onVote}
            onFlag={onFlag}
          />
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  reviewsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reviewsTitle: { ...typography.display, color: tokens.colors.ink, fontSize: 16 },
  writeReviewBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: tokens.colors.glass, borderWidth: 1, borderColor: tokens.colors.line },
  writeReviewBtnDisabled: { backgroundColor: 'rgba(100,116,139,0.1)', borderColor: 'rgba(100,116,139,0.2)' },
  writeReviewLink: { color: tokens.colors.accent, fontSize: 13, fontFamily: 'Inter_500Medium' },
  writeReviewLinkDisabled: { color: tokens.colors.muted },
  noReviewsText: { color: tokens.colors.muted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginVertical: 10 },
});
