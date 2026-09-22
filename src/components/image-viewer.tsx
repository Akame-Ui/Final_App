import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';
import { StyleSheet } from 'react-native';

type Props = {
  imgSource: ImageSourcePropType;
};

export default function ImageViewer({ imgSource }: Props) {
  return <Image source={imgSource} style={styles.image} contentFit="cover" />;
}

const styles = StyleSheet.create({
  image: {
    width: 320,
    height: 440,
    borderRadius: 18,
  },
});
