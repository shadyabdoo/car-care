import { StyleSheet, View } from 'react-native';

type Props = {
  colors: {
    background: string;
    accent: string;
    grid: string;
  };
};

export default function CockpitBackdrop({ colors }: Props) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.glow,
          {
            backgroundColor: colors.accent,
            opacity: colors.background === '#05070A' ? 0.055 : 0.09,
          },
        ]}
      />
      <View style={styles.grid}>
        {Array.from({ length: 22 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.gridLine,
              { top: index * 28, backgroundColor: colors.grid },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: -200,
    left: '8%',
    width: '84%',
    height: 350,
    borderRadius: 180,
  },
  grid: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
