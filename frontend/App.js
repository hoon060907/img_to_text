import { useState } from 'react';
import {
  StyleSheet, Text, View, Button, Image, ActivityIndicator,
  ScrollView, TextInput, TouchableOpacity, Alert, SafeAreaView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

export default function App() {
  const [imageUri, setImageUri] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);

  // Read API URL from .env file (EXPO_PUBLIC_API_URL)
  // Fallback to localhost if not provided
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000');

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(extractedText);
    Alert.alert('복사 완료', '클립보드에 복사되었습니다.');
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라에 접근하려면 권한이 필요합니다.');
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진첩에 접근하려면 권한이 필요합니다.');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setExtractedText('');
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setExtractedText('');
    }
  };

  const handleUpload = async () => {
    if (!imageUri) {
      Alert.alert('유효하지 않음', '먼저 이미지를 선택해주세요.');
      return;
    }

    setLoading(true);
    setExtractedText('');

    try {
      const formData = new FormData();

      // Determine file name and type easily
      const localUri = imageUri;
      const filename = localUri.split('/').pop() || 'photo.jpg';

      // Infer the type of the image
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('file', {
        uri: localUri,
        name: filename,
        type
      });

      const response = await axios.post(`${apiUrl}/ocr/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.status === 'success') {
        const text = response.data.extracted_text;
        setExtractedText(text ? text : "텍스트를 찾지 못했습니다.");
      } else {
        Alert.alert('오류', 'OCR 처리를 실패했습니다.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('네트워크 오류', `서버 요청 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Image To Text</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
            <Text style={styles.actionBtnText}>📷 사진 촬영 (Camera)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
            <Text style={styles.actionBtnText}>🖼️ 갤러리 (Gallery)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>선택된 이미지가 없습니다.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.uploadBtn, !imageUri && styles.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={!imageUri || loading}
        >
          <Text style={styles.uploadBtnText}>✨ 변환 (Extract Text)</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>텍스트 추출 중...</Text>
          </View>
        )}

        {extractedText !== '' && (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeaderRow}>
              <Text style={styles.resultHeader}>추출된 텍스트:</Text>
              <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
                <Ionicons name="copy-outline" size={18} color="#007AFF" />
                <Text style={styles.copyButtonText}>복사</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.resultText} selectable={true}>{extractedText}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9FA',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  uploadBtn: {
    backgroundColor: '#007AFF',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadBtnDisabled: {
    backgroundColor: '#A1C6FF',
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultHeader: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    marginLeft: 4,
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 28,
  },
});
