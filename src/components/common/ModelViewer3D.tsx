import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { Skeleton } from './Skeleton';

export type ModelAsset =
  | number
  | { default?: number; uri?: string; localUri?: string };

interface ModelViewer3DProps {
  modelAsset: ModelAsset;
  fallbackImage?: string;
  testID?: string;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({ modelAsset, fallbackImage, testID }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [webModelUrl, setWebModelUrl] = useState<string | null>(null);

  let assetVal = modelAsset;
  if (modelAsset && typeof modelAsset === 'object' && 'default' in modelAsset) {
    assetVal = modelAsset.default;
  }

  useEffect(() => {
    if (!modelAsset) {
      setHasError(true);
      setIsLoading(false);
    }
  }, [modelAsset]);

  let resolvedAsset;
  try {
    if (assetVal) {
      resolvedAsset = Asset.fromModule(assetVal);
    }
  } catch (e) {
    console.warn('Failed to resolve asset via expo-asset', e);
  }

  let modelUri = '';
  if (typeof assetVal === 'string') {
    modelUri = assetVal;
  } else if (resolvedAsset && (resolvedAsset.localUri || resolvedAsset.uri)) {
    modelUri = resolvedAsset.localUri || resolvedAsset.uri;
  } else if (assetVal && typeof assetVal === 'object') {
    modelUri = assetVal.localUri || assetVal.uri || '';
  }

  if (Platform.OS === 'web' && modelUri && !modelUri.startsWith('http') && !modelUri.startsWith('data:')) {
    modelUri = window.location.origin + (modelUri.startsWith('/') ? '' : '/') + modelUri;
  }

  if (__DEV__) {
    console.log('ModelViewer3D Asset Trace:', {
      Platform: Platform.OS,
      uri: resolvedAsset?.uri,
      localUri: resolvedAsset.localUri,
      modelUri,
    });
  }

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setWebModelUrl(null);

    async function resolveWebModel() {
      if (!modelUri) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(modelUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch model: ${response.status}`);
        }
        const blob = await response.blob();
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        setWebModelUrl(blobUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('ModelViewer3D web fetch error:', err);
        if (!cancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    }

    resolveWebModel();

    return () => {
      cancelled = true;
      if (webModelUrl) {
        URL.revokeObjectURL(webModelUrl);
      }
    };
  }, [modelUri]);

  if (Platform.OS === 'web') {
    const scriptId = 'model-viewer-script';
    useEffect(() => {
      if (hasError) return;
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'module';
        script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
        document.head.appendChild(script);
      }
    }, [hasError]);

    if (hasError || !webModelUrl) {
      return (
        <View style={styles.webContainer}>
          {fallbackImage ? (
            <Image
              source={{ uri: fallbackImage }}
              style={styles.fallbackImage}
              contentFit="contain"
            />
          ) : (
            <View style={styles.errorFallbackContainer}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.errorFallbackIcon}
                contentFit="contain"
              />
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.webContainer}>
        {isLoading && (
          <View style={styles.webLoaderContainer}>
            <Skeleton width="100%" height="100%" borderRadius={18} />
          </View>
        )}
        <div
          style={{ width: '100%', height: '100%', minHeight: '350px', opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s' }}
          dangerouslySetInnerHTML={{
            __html: `
              <model-viewer 
                id="web-viewer"
                src="${webModelUrl}" 
                camera-controls 
                auto-rotate 
                shadow-intensity="1" 
                environment-image="neutral"
                style="width: 100%; height: 100%; min-height: 350px; background: transparent; outline: none;"
              ></model-viewer>
              <script>
                document.getElementById('web-viewer').addEventListener('load', function() {
                  window.dispatchEvent(new CustomEvent('model-loaded'));
                });
                document.getElementById('web-viewer').addEventListener('error', function(err) {
                  console.error('model-viewer error:', err);
                  window.dispatchEvent(new CustomEvent('model-error'));
                });
              </script>
            `,
          }}
        />
        <WebListener onLoad={() => setIsLoading(false)} onError={() => setHasError(true)} />
      </View>
    );
  }

  const { WebView } = require('react-native-webview');

  let baseUrl = '';
  let modelSrc = modelUri;

  if (Platform.OS === 'android') {
    baseUrl = 'file:///android_asset/';
  } else if (Platform.OS === 'ios' && modelUri && modelUri.startsWith('file://')) {
    const lastSlash = modelUri.lastIndexOf('/');
    if (lastSlash !== -1) {
      baseUrl = modelUri.substring(0, lastSlash + 1);
      modelSrc = modelUri.substring(lastSlash + 1);
    }
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #F6F2EE; }
          #container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
          model-viewer { width: 100%; height: 100%; background-color: transparent; }
        </style>
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
      </head>
      <body>
        <div id="container">
          <model-viewer 
            id="viewer"
            src="${modelSrc}" 
            camera-controls 
            auto-rotate 
            shadow-intensity="1.5"
            environment-image="neutral"
          ></model-viewer>
        </div>
        <script>
          var viewer = document.getElementById('viewer');
          viewer.addEventListener('load', function() {
            window.ReactNativeWebView.postMessage('loaded');
          });
          viewer.addEventListener('error', function(err) {
            console.error('model-viewer error:', err);
            window.ReactNativeWebView.postMessage('error');
          });
        </script>
      </body>
    </html>
  `;

  if (hasError) {
    return (
      <View style={styles.nativeContainer} testID={testID}>
        {fallbackImage ? (
          <Image
            source={{ uri: fallbackImage }}
            style={styles.fallbackImage}
            contentFit="contain"
            testID={testID ? `${testID}-fallback-image` : undefined}
          />
        ) : (
          <View style={styles.errorFallbackContainer}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.errorFallbackIcon}
              contentFit="contain"
              testID={testID ? `${testID}-error-fallback-icon` : undefined}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.nativeContainer} testID={testID}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: baseUrl }}
        style={[styles.webView, { opacity: isLoading ? 0 : 1 }]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        testID={testID ? `${testID}-webview` : undefined}
        onShouldStartLoadWithRequest={(request: any) => {
          if (
            request.url.startsWith('http://') ||
            request.url.startsWith('https://') ||
            request.url.startsWith('file://') ||
            request.url.startsWith('about:blank') ||
            request.url.startsWith('data:')
          ) {
            return true;
          }
          if (Platform.OS === 'android' && request.url.startsWith('intent://')) {
            try {
              const { Linking } = require('react-native');
              Linking.openURL(request.url).catch((err: any) => {
                console.warn('Failed to open intent link:', err);
              });
            } catch (err) {
              console.warn('Failed to require Linking:', err);
            }
            return false;
          }
          return false;
        }}
        onMessage={(event: any) => {
          const data = event.nativeEvent.data;
          if (data === 'loaded') {
            setIsLoading(false);
          } else if (data === 'error') {
            setHasError(true);
            setIsLoading(false);
          }
        }}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
      {isLoading && (
        <View style={styles.loaderContainer}>
          <Skeleton width="100%" height="100%" borderRadius={18} />
        </View>
      )}
    </View>
  );
};

const WebListener = ({ onLoad, onError }: { onLoad: () => void; onError: () => void }) => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleLoad = () => onLoad();
    const handleError = () => onError();
    window.addEventListener('model-loaded', handleLoad);
    window.addEventListener('model-error', handleError);
    return () => {
      window.removeEventListener('model-loaded', handleLoad);
      window.removeEventListener('model-error', handleError);
    };
  }, [onLoad, onError]);
  return null;
};

const styles = StyleSheet.create({
  webContainer: {
    width: '100%',
    height: '100%',
    minHeight: 350,
    position: 'relative',
    backgroundColor: '#F6F2EE',
  },
  webLoaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  nativeContainer: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F6F2EE',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F6F2EE',
  },
  errorFallbackContainer: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorFallbackIcon: {
    width: 64,
    height: 64,
    opacity: 0.3,
  },
});
