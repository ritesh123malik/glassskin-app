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
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useAppStore } from '../../store/useAppStore';
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
  deleteReviewImage,
  MAX_REVIEW_PHOTOS,
  ReviewImage,
} from '../../services/reviewService';
import { Review } from '../../types';
import { tokens } from '../../theme/tokens';

import { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import {
  ProductHeader,
  ProductInfo,
  AddToCartCard,
  ProductDetails,
  ReviewsSection,
  RelatedProducts,
  WriteReviewModal,
} from './components';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProductDetails'>;
  route: RouteProp<RootStackParamList, 'ProductDetails'>;
};

export const ProductDetailScreen = ({ route, navigation }: Props) => {
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
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedReviews: Review[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        user_name: sanitizeText(item.user?.full_name || 'Anonymous User'),
        product_id: item.product_id,
        rating: item.rating,
        comment: sanitizeText(item.comment || ''),
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
      const result = await submitReview({
        userId: user.id,
        productId,
        rating: newRating,
        comment: trimmed,
        imageUrls: [],
      });

      if (reviewImages.length > 0) {
        uploadedUrls = await uploadReviewImages(user.id, result.id, reviewImages);

        try {
          await supabaseClient
            .from('reviews')
            .update({ images: uploadedUrls })
            .eq('id', result.id);
        } catch (updateErr) {
          await Promise.all(
            uploadedUrls.map((url) =>
              deleteReviewImage(url).catch((cleanupErr) =>
                console.error('Failed to delete orphaned review image:', cleanupErr)
              )
            )
          );
          throw updateErr;
        }
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
    const newDirection = existing === direction ? null : direction;

    setVotingId(reviewId);

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
      <ProductHeader
        onBack={() => navigation.goBack()}
        onToggleWishlist={handleToggleWishlist}
        wishlisted={wishlisted}
        title="Product Details"
      />

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

        <ProductInfo product={currentProduct} />

        <AddToCartCard
          quantity={quantity}
          onQuantityChange={setQuantity}
          onAddToCart={handleAddToCart}
        />

        <ProductDetails
          product={currentProduct}
          expandedSection={expandedSection}
          onToggleSection={toggleSection}
        />

        <ReviewsSection
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          isVerifiedBuyer={isVerifiedBuyer}
          onWriteReview={openReviewModal}
          onVote={handleVote}
          onFlag={handleFlag}
          userVotes={userVotes}
          votingId={votingId}
          flaggingId={flaggingId}
          currentUserId={user?.id}
        />

        <RelatedProducts
          products={relatedProducts}
          onProductPress={(id) => navigation.navigate('ProductDetails', { productId: id })}
        />
      </ScrollView>

      {/* ── WRITE REVIEW MODAL ──────────────────────────────────────────────── */}
      <WriteReviewModal
        visible={isReviewModalOpen}
        newRating={newRating}
        newComment={newComment}
        reviewImages={reviewImages}
        pickingImages={pickingImages}
        submittingReview={submittingReview}
        imageError={imageError}
        onClose={() => setIsReviewModalOpen(false)}
        onRatingChange={setNewRating}
        onCommentChange={setNewComment}
        onPickImages={handlePickImages}
        onRemoveImage={handleRemoveImage}
        onSubmit={handleSubmitReview}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.colors.background, gap: 12 },
  loadingText: { color: tokens.colors.muted, fontSize: 15, fontFamily: 'Inter_400Regular' },
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
});
