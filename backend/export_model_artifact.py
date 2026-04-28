from main import save_model_artifact, train_model_from_dataset


def main() -> None:
    pipeline, accuracy = train_model_from_dataset()
    artifact_path = save_model_artifact(pipeline, accuracy)
    print(f"Model artifact exported: {artifact_path}")
    print(f"Model accuracy: {accuracy:.2f}%")


if __name__ == "__main__":
    main()
