import { StyleSheet, Text, View } from 'react-native';

type WelcomeCardProps = {
  title: string;
  subtitle: string;
};

export default function WelcomeCard({ title, subtitle }: WelcomeCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
});
