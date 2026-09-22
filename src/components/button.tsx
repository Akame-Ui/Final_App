import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  theme?: 'primary';
};

export default function Button({ label, theme }: Props) {
  if (theme === 'primary') {
    return (
      <View style={[styles.buttonContainer, styles.primaryContainer]}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.pressed]}
          onPress={() => Alert.alert('Photo picker', 'Choose a photo from your device.')}> 
          <SymbolView
            name={{ ios: 'photo', android: 'image', web: 'image' }}
            size={18}
            tintColor="#25292e"
            style={styles.buttonIcon}
          />
          <Text style={[styles.buttonLabel, styles.primaryLabel]}>{label}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.buttonContainer}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => Alert.alert('Photo selected', 'You pressed a button.')}> 
        <Text style={styles.buttonLabel}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    width: 320,
    height: 68,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  primaryContainer: {
    borderWidth: 4,
    borderColor: '#ffd33d',
    borderRadius: 18,
  },
  button: {
    borderRadius: 10,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#3b3d42',
  },
  primaryButton: {
    backgroundColor: '#ffffff',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  primaryLabel: {
    color: '#25292e',
  },
  pressed: {
    opacity: 0.7,
  },
});
