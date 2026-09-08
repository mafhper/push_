import styles from "./MacDots.module.css";

export function MacDots() {
  return (
    <span className={styles.dots} aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}