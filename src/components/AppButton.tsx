import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  theme?: 'primary';
  icon?: 'camera' | 'refresh' | 'login' | 'register' | 'logout';
  onPress: () => void;
  disabled?: boolean;
};

export default function AppButton({ title, theme, icon, onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, theme === 'primary' && styles.primary, disabled && styles.disabled, pressed && styles.pressed]}>
      {icon && (
        <SymbolView
          name={
            icon === 'camera'
              ? { ios: 'camera.fill', android: 'camera', web: 'camera' }
              : icon === 'refresh'
                ? { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }
                : icon === 'login'
                  ? { ios: 'arrow.right.circle.fill', android: 'login', web: 'login' }
                  : icon === 'register'
                    ? { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }
                    : { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }
          }
          tintColor={theme === 'primary' ? COLORS.textOnPrimary : COLORS.textPrimary}
          size={18}
        />
      )}
      <Text style={[styles.label, theme === 'primary' && styles.primaryLabel]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 190,
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
  },
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryLabel: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.5,
  },
});
