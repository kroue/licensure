from main import ensure_training_model, get_model_accuracy_pct, save_model_artifact


def main() -> None:
    pipeline = ensure_training_model()
    accuracy = get_model_accuracy_pct()
    artifact_path = save_model_artifact(pipeline, accuracy)
    print(f"Model artifact exported: {artifact_path}")
    print(f"Model accuracy: {accuracy:.2f}%")


if __name__ == "__main__":
    main()
