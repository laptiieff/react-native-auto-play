//
//  CarPlayViewController.swift
//
//  Created by Manuel Auer on 30.09.25.
//

class AutoPlaySceneViewController: UIViewController {
    let moduleName: String

    public init(view: UIView, moduleName: String) {
        self.moduleName = moduleName

        super.init(nibName: nil, bundle: nil)

        self.view = view
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func traitCollectionDidChange(
        _ previousTraitCollection: UITraitCollection?
    ) {
        guard let scene = SceneStore.getScene(moduleName: moduleName) else {
            return
        }
        scene.traitCollectionDidChange(
            traitCollection: traitCollection
        )
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        guard let scene = SceneStore.getScene(moduleName: moduleName) else {
            return
        }
        scene.safeAreaInsetsDidChange(
            safeAreaInsets: self.view.safeAreaInsets
        )
    }
}
