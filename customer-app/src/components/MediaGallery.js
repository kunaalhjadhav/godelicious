// Partner photo gallery (swipe) with a full-screen viewer, plus their video.
import React, { useState } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, Modal, StyleSheet, Dimensions, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { API_URL } from "../api/client";
import { colors, spacing } from "../theme";

const full = (u) => (!u ? "" : u.startsWith("/") ? `${API_URL}${u}` : u);
const ytId = (u) => (String(u).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/) || [])[1];
const isFileVideo = (u) => /\.(mp4|mov|webm)(\?|$)/i.test(u) || /\/video\/upload\//.test(u) || /\/api\/uploads\/file\//.test(u);

export default function MediaGallery({ photos = [], videoUrl, height = 220 }) {
  const { width } = Dimensions.get("window");
  const [page, setPage] = useState(0);
  const [viewer, setViewer] = useState(null);
  if (!photos.length && !videoUrl) return null;

  const yt = videoUrl ? ytId(videoUrl) : null;
  const videoHtml = videoUrl && !yt && isFileVideo(videoUrl)
    ? `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#000"><video src="${full(videoUrl)}" controls playsinline preload="metadata" style="width:100%;height:100%;object-fit:contain"></video></body></html>`
    : null;

  return (
    <View>
      {photos.length > 0 && (
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
            {photos.map((u, i) => (
              <TouchableOpacity key={u} activeOpacity={0.9} onPress={() => setViewer(i)}>
                <Image source={{ uri: full(u) }} style={{ width, height }} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((u, i) => <View key={u} style={[styles.dot, i === page && styles.dotOn]} />)}
            </View>
          )}
        </View>
      )}

      {!!videoUrl && (
        <View style={styles.videoWrap}>
          {yt ? (
            <WebView source={{ uri: `https://www.youtube.com/embed/${yt}?playsinline=1` }} style={styles.video}
              allowsInlineMediaPlayback mediaPlaybackRequiresUserAction javaScriptEnabled />
          ) : videoHtml ? (
            <WebView source={{ html: videoHtml }} style={styles.video} originWhitelist={["*"]}
              allowsInlineMediaPlayback mediaPlaybackRequiresUserAction javaScriptEnabled />
          ) : (
            <TouchableOpacity style={styles.watchBtn} onPress={() => Linking.openURL(videoUrl)}>
              <Text style={styles.watchText}>▶  Watch video</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewer}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (viewer || 0) * width, y: 0 }}>
            {photos.map((u) => (
              <Image key={u} source={{ uri: full(u) }} style={{ width, height: "100%" }} resizeMode="contain" />
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.close} onPress={() => setViewer(null)}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", justifyContent: "center", paddingVertical: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line, marginHorizontal: 3 },
  dotOn: { backgroundColor: colors.saffron2, width: 14 },
  videoWrap: { marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: 12, overflow: "hidden" },
  video: { height: 210, backgroundColor: "#000" },
  watchBtn: { backgroundColor: colors.charcoal, paddingVertical: 12, alignItems: "center", borderRadius: 12 },
  watchText: { color: colors.white, fontWeight: "700" },
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
  close: { position: "absolute", top: 50, right: 20, padding: 8 },
  closeText: { color: "#fff", fontSize: 26 },
});
