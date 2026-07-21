import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { tokens } from '../../../theme/tokens';

type Props = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
};

export const SearchBar = ({ searchQuery, onSearchChange, onSearch }: Props) => {
  return (
    <View style={styles.searchContainer}>
      <GlassCard variant="float-card" style={styles.searchBar}>
        <Search size={18} color={tokens.colors.muted} style={styles.searchIcon} />
        <TextInput
          placeholder="Search products, ingredients..."
          placeholderTextColor={tokens.colors.muted}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={onSearch} style={styles.searchGoBtn}>
            <Text style={styles.searchGoBtnText}>Go</Text>
          </TouchableOpacity>
        )}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: tokens.colors.ink,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    padding: 0,
    height: 40,
  },
  searchGoBtn: {
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchGoBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Raleway_700Bold',
  },
});
