import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { X, Star, Camera } from 'lucide-react-native';
import { GlassButton } from '../../../components/common/GlassButton';
import { ReviewImage, MAX_REVIEW_PHOTOS } from '../../../services/reviewService';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  visible: boolean;
  newRating: number;
  newComment: string;
  reviewImages: ReviewImage[];
  pickingImages: boolean;
  submittingReview: boolean;
  imageError: string | null;
  onClose: () => void;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onPickImages: () => void;
  onRemoveImage: (index: number) => void;
  onSubmit: () => void;
};

export const WriteReviewModal = ({
  visible,
  newRating,
  newComment,
  reviewImages,
  pickingImages,
  submittingReview,
  imageError,
  onClose,
  onRatingChange,
  onCommentChange,
  onPickImages,
  onRemoveImage,
  onSubmit,
}: Props) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Write a Review</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#0B0B0C" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBody}>
              {/* Rating */}
              <Text style={styles.label}>Your Rating</Text>
              <View style={styles.modalStarsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => onRatingChange(s)}
                    style={styles.modalStarBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${s} star${s > 1 ? 's' : ''}`}
                    accessibilityHint={`Double tap to select a ${s}-star rating`}
                    accessibilityState={{ selected: s === newRating }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Star
                      size={32}
                      color={s <= newRating ? '#FBBF24' : '#334155'}
                      fill={s <= newRating ? '#FBBF24' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Comment */}
              <Text style={styles.label}>Your Review <Text style={styles.labelHint}>(min 10 chars)</Text></Text>
              <TextInput
                placeholder="Share your experience with this product..."
                placeholderTextColor="rgba(248, 250, 252, 0.3)"
                style={styles.reviewInput}
                multiline
                numberOfLines={4}
                value={newComment}
                onChangeText={onCommentChange}
                maxLength={2000}
              />
              <Text style={styles.charCount}>{newComment.length}/2000</Text>

              {/* Photo picker */}
              <Text style={styles.label}>
                Photos <Text style={styles.labelHint}>(up to {MAX_REVIEW_PHOTOS}, JPEG/PNG/WebP, max 2 MB each)</Text>
              </Text>

              <View style={styles.photoRow}>
                {reviewImages.map((img, i) => (
                  <View key={i} style={styles.photoThumb}>
                    <Image source={{ uri: img.localUri }} style={styles.thumbImage} contentFit="cover" cachePolicy="disk" />
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={() => onRemoveImage(i)}
                    >
                      <X size={12} color="#0B0B0C" />
                    </TouchableOpacity>
                    <Text style={styles.thumbSize}>
                      {(img.compressedSizeBytes / 1024).toFixed(0)}KB
                    </Text>
                  </View>
                ))}

                {reviewImages.length < MAX_REVIEW_PHOTOS && (
                  <TouchableOpacity
                    style={styles.addPhotoBtn}
                    onPress={onPickImages}
                    disabled={pickingImages}
                    id="pick-review-photo-btn"
                  >
                    {pickingImages
                      ? <ActivityIndicator color="#8E5D34" size="small" />
                      : <Camera size={22} color="#8E5D34" />}
                    <Text style={styles.addPhotoText}>
                      {pickingImages ? 'Processing…' : 'Add Photo'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {imageError && (
                <View style={styles.imageErrorBox}>
                  <Text style={styles.imageErrorText}>⚠ {imageError}</Text>
                </View>
              )}

              <GlassButton
                title="Submit Review"
                onPress={onSubmit}
                loading={submittingReview}
                variant="primary"
                style={styles.submitReviewBtn}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

import { Image } from 'expo-image';

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: tokens.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderColor: tokens.colors.line,
  },
  modalTitle: { ...typography.display, color: tokens.colors.ink, fontSize: 20 },
  modalScrollBody: { flex: 1 },
  modalBody: { padding: 20 },
  label: { color: tokens.colors.ink, fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 8, marginTop: 4 },
  labelHint: { color: tokens.colors.muted, fontSize: 12, fontFamily: 'Inter_400Regular', fontWeight: '400' },
  modalStarsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 8 },
  modalStarBtn: { padding: 4 },
  reviewInput: {
    backgroundColor: tokens.colors.glass,
    borderWidth: 1, borderColor: tokens.colors.line, borderRadius: 12,
    color: tokens.colors.ink, fontFamily: 'Inter_400Regular', fontSize: 14,
    padding: 12, minHeight: 100, textAlignVertical: 'top',
  },
  charCount: { color: tokens.colors.muted, fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right', marginTop: 4, marginBottom: 16 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 10,
    backgroundColor: tokens.colors.accentGlow,
    borderWidth: 1.5, borderColor: tokens.colors.accent,
    borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  addPhotoText: { color: tokens.colors.accent, fontSize: 10, fontFamily: 'Inter_500Medium' },
  photoThumb: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumbImage: { width: 80, height: 80 },
  thumbRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 10, padding: 3,
  },
  thumbSize: {
    position: 'absolute', bottom: 3, left: 3,
    color: '#FFF', fontSize: 9, fontFamily: 'Inter_400Regular',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 3, borderRadius: 3,
  },
  imageErrorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  imageErrorText: { color: '#EF4444', fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  submitReviewBtn: { width: '100%', marginTop: 8 },
});
