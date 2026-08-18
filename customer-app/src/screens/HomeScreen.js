import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, RefreshControl,
} from "react-native";
import { api, API_URL } from "../api/client";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";
import BannerCarousel from "../components/BannerCarousel";
import ComboPickerModal from "../components/ComboPickerModal";
import { APP_NAME } from "../brand";

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function HomeScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [comboItem, setComboItem] = useState(null);
  const { addItem, itemCount, totalAmount } = useCart();

  function handleAddPress(item) {
    if (item.isCombo && item.comboGroups?.length > 0) {
      setComboItem(item);
    } else {
      addItem(item);
    }
  }

  function confirmCombo(selectedOptions) {
    addItem(comboItem, selectedOptions);
    setComboItem(null);
  }

  const load = useCallback(async (categoryId) => {
    try {
      const [catData, menuData] = await Promise.all([
        categories.length ? Promise.resolve({ categories }) : api.listCategories(),
        api.listMenu(categoryId),
      ]);
      if (!categories.length) setCategories(catData.categories);
      setItems(menuData.items);
    } catch (err) {
      console.warn("Failed to load menu:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categories]);

  useEffect(() => {
    load(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  function onRefresh() {
    setRefreshing(true);
    load(activeCategory);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.saffron2} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <BannerCarousel />
      <View style={styles.header}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={{ marginRight: spacing.md }}>
            <Text style={styles.venueLink}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("VenueEnquiry")}>
            <Text style={styles.venueLink}>Enquire for a venue →</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        data={[{ id: null, name: "All" }, ...categories]}
        keyExtractor={(c) => c.id || "all"}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveCategory(item.id)}
            style={[styles.chip, activeCategory === item.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, activeCategory === item.id && styles.chipTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: itemCount ? 90 : spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imageUrl ? (
              <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.basil : colors.chili }]} />
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.isCombo && (
                  <View style={styles.comboBadge}>
                    <Text style={styles.comboBadgeText}>COMBO</Text>
                  </View>
                )}
              </View>
              {!!item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>₹{item.price}</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => handleAddPress(item)}>
                  <Text style={styles.addButtonText}>{item.isCombo ? "Customize" : "Add"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No items in this category right now.</Text>}
      />

      <ComboPickerModal
        visible={!!comboItem}
        item={comboItem}
        onConfirm={confirmCombo}
        onClose={() => setComboItem(null)}
      />

      {itemCount > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => navigation.navigate("Cart")}>
          <Text style={styles.cartBarText}>{itemCount} item{itemCount > 1 ? "s" : ""} · ₹{totalAmount.toFixed(0)}</Text>
          <Text style={styles.cartBarAction}>View cart →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  header: {
    padding: spacing.md, backgroundColor: colors.charcoal,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  brand: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  venueLink: { color: colors.saffron, fontSize: 13 },
  categoryRow: { flexGrow: 0, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginHorizontal: 4,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  chipText: { color: colors.ink, fontSize: 13 },
  chipTextActive: { color: colors.paper },
  card: {
    flexDirection: "row", backgroundColor: colors.white, borderRadius: 6, marginBottom: spacing.sm,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.line,
  },
  cardImage: { width: 64, height: 64, borderRadius: 4, marginRight: spacing.sm },
  cardImagePlaceholder: { backgroundColor: colors.line },
  cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  vegDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  comboBadge: { backgroundColor: "rgba(232,163,61,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginLeft: 6 },
  comboBadgeText: { fontSize: 9, fontWeight: "700", color: colors.saffron2 },
  cardDesc: { fontSize: 12, color: colors.inkFaint, marginBottom: 6 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPrice: { fontSize: 14, fontWeight: "600", color: colors.ink },
  addButton: { backgroundColor: colors.saffron, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 4 },
  addButtonText: { color: colors.charcoal, fontWeight: "700", fontSize: 12 },
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  cartBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.charcoal,
    padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  cartBarText: { color: colors.paper, fontWeight: "600" },
  cartBarAction: { color: colors.saffron, fontWeight: "600" },
});
