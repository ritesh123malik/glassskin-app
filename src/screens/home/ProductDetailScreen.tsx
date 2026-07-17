/**
 * ProductDetailScreen.tsx
 *
 * Full-featured product detail page including:
 *  - Review photo upload (with client-side format + size validation)
 *  - Helpful / not-helpful voting (unique per user, retractable)
 *  - Review flagging / reporting
 *  - Sanitised text rendering (sanitizeText strips HTML/control chars)
 *  - Purchase-gated "Write Review" modal
 *  - Verified-purchase badges
 *  - Moderation status filter (only 'published' reviews displayed)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Heart, ChevronDown, ChevronUp, Star, Plus, Minus, X,
  ThumbsUp, ThumbsDown, Flag, Camera, ShieldCheck,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { supabaseClient } from '../../services/supabaseClient';
import { analytics } from '../../services/analytics';
import {
  sanitizeText,
  pickAndCompressImages,
  uploadReviewImages,
  submitReview,
  voteReview,
  flagReview,
  fetchUserVotes,
  MAX_REVIEW_PHOTOS,
  ReviewImage,
} from '../../services/reviewService';
import { Review } from '../../types';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

export const ProductDetailScreen = ({ route, navigation }: any) => {
  const { productId } = route.params;
  const {
    currentProduct, fetchProductById, productsLoading,
    toggleWishlist, isProductWishlisted, addToCart, products,
    user,
  } = useAppStore();

  const [quantity, setQuantity] = useState(1);
  const [expandedSection, setExpandedSection] = useState<'desc' | 'ing' | 'use' | null>('desc');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Purchase verification gate
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState<boolean | null>(null);

  // Review form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<ReviewImage[]>([]);
  const [pickingImages, setPickingImages] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Voting & flag state — maps reviewId → direction
  const [userVotes, setUserVotes] = useState<Record<string, 'helpful' | 'not_helpful'>>({});
  const [votingId, setVotingId] = useState<string | null>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);

  const wishlisted = isProductWishlisted(productId);

  useEffect(() => {
    fetchProductById(productId);
    loadReviews();
    if (user) {
      checkPurchaseVerification(user.id);
    }
    analytics.trackScreenView('ProductDetails');
  }, [productId, user?.id]);

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('reviews')
        .select('*, user:users(full_name)')
        .eq('product_id', productId)
        .eq('status', 'published')         // ← only show published reviews
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedReviews: Review[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        user_name: sanitizeText(item.user?.full_name || 'Anonymous User'),
        product_id: item.product_id,
        rating: item.rating,
        comment: sanitizeText(item.comment || ''),  // ← sanitise before storage/display
        images: item.images,
        helpful_count: item.helpful_count || 0,
        created_at: item.created_at,
        status: item.status,
        verified_purchase: item.verified_purchase ?? false,
      }));

      setReviews(mappedReviews);

      // Load the current user's votes for this batch of reviews
      if (user && mappedReviews.length > 0) {
        const voteMap = await fetchUserVotes(user.id, mappedReviews.map(r => r.id));
        setUserVotes(voteMap);
      }
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkPurchaseVerification = async (userId: string) => {
    try {
      const { data } = await supabaseClient.rpc('check_verified_purchase', {
        p_user_id: userId,
        p_product_id: productId,
      });
      setIsVerifiedBuyer(Boolean(data));
    } catch (err) {
      console.error('[ProductDetailScreen] checkPurchaseVerification Error:', err);
      setIsVerifiedBuyer(false);
    }
  };

  const handleAddToCart = () => {
    if (currentProduct) {
      addToCart(currentProduct.id, quantity);
      analytics.trackAddToCart(currentProduct.id, currentProduct.name, quantity, currentProduct.price);
      Alert.alert('Added to Cart', `${quantity} × ${currentProduct.name} added.`);
    }
  };

  const handleToggleWishlist = () => {
    if (currentProduct) {
      const added = !wishlisted;
      toggleWishlist(currentProduct.id);
      analytics.trackWishlistToggle(currentProduct.id, currentProduct.name, added);
    }
  };

  const toggleSection = (section: 'desc' | 'ing' | 'use') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // ── Photo picking ─────────────────────────────────────────────────────────────

  const handlePickImages = async () => {
    setImageError(null);
    setPickingImages(true);
    try {
      const picked = await pickAndCompressImages(reviewImages.length);
      if (picked.length > 0) {
        setReviewImages(prev => [...prev, ...picked].slice(0, MAX_REVIEW_PHOTOS));
      }
    } catch (err: any) {
      setImageError(err.message);
    } finally {
      setPickingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
  };

  // ── Review submission ─────────────────────────────────────────────────────────

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to submit a review.');
      return;
    }
    const trimmed = newComment.trim();
    if (trimmed.length < 10) {
      Alert.alert('Review too short', 'Please write at least 10 characters.');
      return;
    }

    setSubmittingReview(true);
    let uploadedUrls: string[] = [];

    try {
      // First insert a placeholder to get the reviewId for the storage path.
      // The submit_review RPC handles full insertion atomically, so we
      // call the RPC with null images first, get the review ID, upload, then update.
      const result = await submitReview({
        userId: user.id,
        productId,
        rating: newRating,
        comment: trimmed,
        imageUrls: [],      // Will be updated below
      });

      // Upload images (if any) using the returned review ID for the path
      if (reviewImages.length > 0) {
        uploadedUrls = await uploadReviewImages(user.id, result.id, reviewImages);

        // Update the review row with the public image URLs
        await supabaseClient
          .from('reviews')
          .update({ images: uploadedUrls })
          .eq('id', result.id);
      }

      setNewComment('');
      setNewRating(5);
      setReviewImages([]);
      setImageError(null);
      setIsReviewModalOpen(false);

      if (result.moderated) {
        Alert.alert(
          'Review Submitted',
          'Your review is pending moderation and will appear shortly after review.',
        );
      } else {
        Alert.alert('Thank you!', 'Your review has been published.');
      }

      await loadReviews();
      await fetchProductById(productId);
    } catch (err: any) {
      const msg = err.message || 'Failed to submit review.';
      // Surface purchase-gate error distinctively
      if (msg.includes('PURCHASE_REQUIRED')) {
        Alert.alert(
          'Verified Purchases Only',
          'You can only review products from a completed, delivered order.',
        );
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Voting ────────────────────────────────────────────────────────────────────

  const handleVote = async (reviewId: string, direction: 'helpful' | 'not_helpful') => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to vote on reviews.');
      return;
    }

    const existing = userVotes[reviewId];
    // Tapping the same direction retracts the vote
    const newDirection = existing === direction ? null : direction;

    setVotingId(reviewId);

    // Optimistic update
    const prevVotes = { ...userVotes };
    const delta = (direction === 'helpful')
      ? (newDirection === null ? -1 : existing ? 0 : 1)
      : 0;

    setUserVotes(prev => {
      const next = { ...prev };
      if (newDirection === null) {
        delete next[reviewId];
      } else {
        next[reviewId] = newDirection;
      }
      return next;
    });

    setReviews(prev =>
      prev.map(r =>
        r.id === reviewId
          ? { ...r, helpful_count: Math.max(0, r.helpful_count + delta) }
          : r
      )
    );

    try {
      await voteReview(user.id, reviewId, newDirection);
    } catch (err: any) {
      // Rollback on server failure
      setUserVotes(prevVotes);
      await loadReviews();
      Alert.alert('Error', err.message || 'Could not record vote.');
    } finally {
      setVotingId(null);
    }
  };

  // ── Flagging ──────────────────────────────────────────────────────────────────

  const handleFlag = async (reviewId: string) => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to report a review.');
      return;
    }

    Alert.alert(
      'Report Review',
      'Report this review as spam, offensive, or inappropriate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            setFlaggingId(reviewId);
            try {
              await flagReview(user.id, reviewId);
              Alert.alert('Reported', 'Thank you. Our team will review this shortly.');
              // Optimistically remove the review if it was auto-flagged (threshold may be 1)
              await loadReviews();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not submit report.');
            } finally {
              setFlaggingId(null);
            }
          },
        },
      ],
    );
  };

  const openReviewModal = () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to write a review.');
      return;
    }
    if (isVerifiedBuyer === false) {
      Alert.alert(
        'Purchase Required',
        'You can only review products that have been delivered to you.\n\nIf your order has been delivered recently, it may take a few minutes to update.',
        [{ text: 'OK' }],
      );
      return;
    }
    setIsReviewModalOpen(true);
  };

  if (productsLoading || !currentProduct) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#8E5D34" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  const relatedProducts = products
    .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id)
    .slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.headerBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Product Details</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleToggleWishlist}
          accessibilityRole="button"
          accessibilityLabel={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          accessibilityHint="Toggles this product in your wishlist"
          testID="wishlist-btn"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Heart
            size={20}
            color={wishlisted ? '#EF4444' : '#0B0B0C'}
            fill={wishlisted ? '#EF4444' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Product Image Stage */}
        <View style={styles.heroStageWrapper}>
          <GlassCard variant="bento-item" style={styles.heroStageCard}>
            <View style={styles.viewerContainer}>
              <Image
                source={{ uri: currentProduct.images[0] }}
                style={styles.image}
                contentFit="contain"
                cachePolicy="disk"
                accessible={true}
                accessibilityLabel={`Product photo of ${currentProduct.name}`}
                accessibilityRole="image"
              />
            </View>
          </GlassCard>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.category}>{sanitizeText(currentProduct.category)}</Text>
          <Text style={styles.name}>{sanitizeText(currentProduct.name)}</Text>

          {/* Rating Row */}
          <View style={styles.ratingRow}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  size={14}
                  color={s <= Math.round(currentProduct.rating) ? '#FBBF24' : '#6B6660'}
                  fill={s <= Math.round(currentProduct.rating) ? '#FBBF24' : 'transparent'}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {currentProduct.rating} ({currentProduct.review_count} reviews)
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>${currentProduct.price.toFixed(2)}</Text>
            {currentProduct.compare_at_price && (
              <Text style={styles.comparePrice}>${currentProduct.compare_at_price.toFixed(2)}</Text>
            )}
          </View>

          {/* Certifications */}
          {currentProduct.certifications && currentProduct.certifications.length > 0 && (
            <View style={styles.certRow}>
              {currentProduct.certifications.map(cert => (
                <View key={cert} style={styles.certBadge}>
                  <Text style={styles.certText}>{sanitizeText(cert)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Add to Cart */}
          <GlassCard variant="float-card" style={styles.actionCard}>
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityBtn}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease quantity"
                  accessibilityHint="Decreases product quantity by one"
                  testID="qty-minus"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Minus size={16} color="#0B0B0C" />
                </TouchableOpacity>
                <Text
                  style={styles.quantityText}
                  accessible={true}
                  accessibilityLabel={`Selected quantity: ${quantity}`}
                >
                  {quantity}
                </Text>
                <TouchableOpacity
                  style={styles.quantityBtn}
                  onPress={() => setQuantity(quantity + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Increase quantity"
                  accessibilityHint="Increases product quantity by one"
                  testID="qty-plus"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Plus size={16} color="#0B0B0C" />
                </TouchableOpacity>
              </View>
            </View>
            <GlassButton title="Add to Cart" onPress={handleAddToCart} variant="primary" style={styles.addToCartBtn} />
          </GlassCard>

          {/* Bento Grid */}
          <View style={styles.bentoGrid}>
            <GlassCard variant="bento-item" style={styles.bentoFull}>
              <Text style={styles.bentoTitle}>Description</Text>
              <Text style={styles.bentoContent}>{sanitizeText(currentProduct.description)}</Text>
            </GlassCard>
            
            <View style={styles.bentoRow}>
              <GlassCard variant="bento-item" style={styles.bentoHalf}>
                <Text style={styles.bentoTitle}>Ingredients</Text>
                <Text style={styles.bentoContent}>
                  {sanitizeText(currentProduct.ingredients || 'Aloe Barbadensis Leaf Juice, Centella Asiatica, Hyaluronic Acid, Niacinamide.')}
                </Text>
              </GlassCard>
              <GlassCard variant="bento-item" style={styles.bentoHalf}>
                <Text style={styles.bentoTitle}>How to Use</Text>
                <Text style={styles.bentoContent}>
                  {sanitizeText(currentProduct.usage || 'Massage 2–3 drops into face and neck morning and night.')}
                </Text>
              </GlassCard>
            </View>
          </View>

          {/* Reviews Header */}
          <View style={styles.reviewsHeaderRow}>
            <Text style={styles.reviewsTitle}>Customer Reviews ({reviews.length})</Text>
            <TouchableOpacity
              id="write-review-btn"
              onPress={openReviewModal}
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
                currentUserId={user?.id}
                userVote={userVotes[rev.id] ?? null}
                votingId={votingId}
                flaggingId={flaggingId}
                onVote={handleVote}
                onFlag={handleFlag}
              />
            ))
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.relatedTitle}>Related Skincare</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
                {relatedProducts.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.relatedCard}
                    onPress={() => navigation.navigate('ProductDetails', { productId: p.id })}
                  >
                    <GlassCard variant="bento-item" style={styles.relatedGlass}>
                      <View style={styles.relatedImagePlaceholder}>
                        <Text style={styles.emojiIcon}>🧴</Text>
                      </View>
                      <Text style={styles.relatedName} numberOfLines={1}>{sanitizeText(p.name)}</Text>
                      <Text style={styles.relatedPrice}>${p.price.toFixed(2)}</Text>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── WRITE REVIEW MODAL ──────────────────────────────────────────────── */}
      <Modal
        visible={isReviewModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsReviewModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setIsReviewModalOpen(false)}>
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
                      onPress={() => setNewRating(s)}
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
                  onChangeText={setNewComment}
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
                        onPress={() => handleRemoveImage(i)}
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
                      onPress={handlePickImages}
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
                  onPress={handleSubmitReview}
                  loading={submittingReview}
                  variant="primary"
                  style={styles.submitReviewBtn}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── ReviewCard Component ────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  userVote: 'helpful' | 'not_helpful' | null;
  votingId: string | null;
  flaggingId: string | null;
  onVote: (reviewId: string, direction: 'helpful' | 'not_helpful') => void;
  onFlag: (reviewId: string) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.colors.background, gap: 12 },
  loadingText: { color: tokens.colors.muted, fontSize: 15, fontFamily: 'Inter_400Regular' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
  },
  headerTitle: {
    ...typography.display,
    color: tokens.colors.ink, fontSize: 16,
    flex: 1, textAlign: 'center', paddingHorizontal: 12,
  },
  headerBtn: { paddingVertical: 4 },
  headerBtnText: { color: tokens.colors.accent, fontSize: 14, fontFamily: 'Inter_500Medium' },
  scrollContent: { paddingBottom: 50 },
  
  // Hero Stage Wrapper
  heroStageWrapper: {
    position: 'relative',
    height: 400,
    marginHorizontal: 20,
    marginBottom: 30,
    marginTop: 20,
  },
  heroStageCard: {
    height: '100%',
    padding: 2, 
    borderRadius: 24,
  },
  viewerContainer: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: '100%', height: '100%' },
  
  infoContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  category: { ...typography.eyebrow, color: tokens.colors.muted },
  name: { ...typography.display, color: tokens.colors.ink, fontSize: 24, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  starsContainer: { flexDirection: 'row' },
  ratingText: { color: tokens.colors.muted, fontSize: 13, fontFamily: 'Inter_400Regular', marginLeft: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12, marginBottom: 16 },
  price: { color: tokens.colors.accent, fontSize: 24, fontFamily: 'Raleway_700Bold', fontWeight: '700' },
  comparePrice: { color: tokens.colors.muted, fontSize: 16, fontFamily: 'Inter_400Regular', textDecorationLine: 'line-through', marginLeft: 8 },
  certRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  certBadge: { backgroundColor: 'rgba(176,122,74,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 8, marginBottom: 6 },
  certText: { color: tokens.colors.accent, fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionCard: { padding: 16, marginBottom: 24 },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  quantityLabel: { color: tokens.colors.ink, fontSize: 15, fontFamily: 'Inter_500Medium' },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: tokens.colors.glass, borderRadius: 8, borderWidth: 1, borderColor: tokens.colors.line },
  quantityBtn: { padding: 10 },
  quantityText: { color: tokens.colors.ink, fontSize: 16, fontFamily: 'Raleway_700Bold', fontWeight: '700', paddingHorizontal: 14 },
  addToCartBtn: { width: '100%' },

  // Bento Grid Layout
  bentoGrid: {
    marginBottom: 30,
    gap: 12,
  },
  bentoFull: {
    padding: 20,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoHalf: {
    flex: 1,
    padding: 20,
  },
  bentoTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 8,
  },
  bentoContent: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },

  // Reviews section
  reviewsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reviewsTitle: { ...typography.display, color: tokens.colors.ink, fontSize: 16 },
  writeReviewBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: tokens.colors.glass, borderWidth: 1, borderColor: tokens.colors.line },
  writeReviewBtnDisabled: { backgroundColor: 'rgba(100,116,139,0.1)', borderColor: 'rgba(100,116,139,0.2)' },
  writeReviewLink: { color: tokens.colors.accent, fontSize: 13, fontFamily: 'Inter_500Medium' },
  writeReviewLinkDisabled: { color: tokens.colors.muted },
  noReviewsText: { color: tokens.colors.muted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginVertical: 10 },

  // ReviewCard
  reviewCard: { padding: 16, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  reviewUserRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 6 },
  reviewUser: { color: tokens.colors.ink, fontSize: 13, fontFamily: 'Inter_500Medium' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { color: '#22C55E', fontSize: 10, fontFamily: 'Inter_500Medium' },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewComment: { color: tokens.colors.ink, opacity: 0.85, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 8 },

  // Review photos
  reviewPhotoScroll: { marginBottom: 10 },
  reviewPhotoRow: { gap: 8 },
  reviewPhoto: { width: 80, height: 80, borderRadius: 8 },

  // Footer
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

  // Related products
  relatedSection: { marginTop: 30 },
  relatedTitle: { ...typography.display, color: tokens.colors.ink, fontSize: 16, marginBottom: 12 },
  relatedScroll: { paddingRight: 20 },
  relatedCard: { marginRight: 10, width: 120 },
  relatedGlass: { padding: 8, alignItems: 'center' },
  relatedImagePlaceholder: { width: 80, height: 80, borderRadius: 8, backgroundColor: tokens.colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emojiIcon: { fontSize: 32 },
  relatedName: { color: tokens.colors.ink, fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center', width: '100%' },
  relatedPrice: { color: tokens.colors.accent, fontSize: 12, fontFamily: 'Raleway_700Bold', fontWeight: '700', marginTop: 4 },

  // Write Review Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: tokens.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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

  // Photo picker
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
