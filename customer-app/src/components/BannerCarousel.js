import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, Dimensions } from "react-native";
import { WebView } from "react-native-webview";
import { api, API_URL } from "../api/client";
import { colors } from "../theme";

const { width } = Dimensions.get("window");
const HEIGHT = 200;

function resolveUrl(url) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// Simple HTML wrapper so a video URL plays inline via WebView, avoiding a
// heavier native video module (react-native-video) and its extra native
// linking/build-config surface — reasonable trade-off for a banner clip.
function videoHtml(url) {
  return `
    <html><body style="margin:0;background:#1C1B19;">
      <video src="${url}" autoplay muted loop playsinline
        style="width:100%;height:100%;object-fit:cover;"></video>
    </body></html>
  `;
}

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    api.listBanners().then((d) => setBanners(d.banners)).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(timerRef.current);
  }, [banners]);

  if (banners.length === 0) return null;

  const banner = banners[index];

  return (
    <View style={styles.container}>
      {banner.mediaType === "IMAGE" ? (
        <Image source={{ uri: resolveUrl(banner.mediaUrl) }} style={styles.media} resizeMode="cover" />
      ) : (
        <WebView
          key={banner.id}
          source={{ html: videoHtml(resolveUrl(banner.mediaUrl)) }}
          style={styles.media}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      )}

      {banner.title && (
        <View style={styles.titleOverlay}>
          <Text style={styles.titleText}>{banner.title}</Text>
        </View>
      )}

      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, height: HEIGHT, backgroundColor: colors.charcoal },
  media: { width, height: HEIGHT },
  titleOverlay: { position: "absolute", bottom: 16, left: 16 },
  titleText: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  dots: { position: "absolute", bottom: 10, right: 14, flexDirection: "row" },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255,255,255,0.4)", marginLeft: 4 },
  dotActive: { backgroundColor: colors.saffron },
});
