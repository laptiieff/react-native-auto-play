//
//  Template.swift
//  Pods
//
//  Created by Manuel Auer on 03.10.25.
//

import CarPlay

class AutoPlayTemplate: NSObject {
    public private(set) var autoDismissMs: Double?

    func getTemplate() -> CPTemplate {
        fatalError("getTemplate not implemented")
    }

    @MainActor final func invalidate() {
        if SceneStore.getRootScene() == nil {
            return
        }

        _invalidate()
    }

    /// Override in subclasses to perform template invalidation.
    /// Do not call this method directly. Call `invalidate()` instead.
    @MainActor func _invalidate() {}
    @MainActor func traitCollectionDidChange() {}

    func onWillAppear(animated: Bool) {}
    func onDidAppear(animated: Bool) {}
    func onWillDisappear(animated: Bool) {}
    func onDidDisappear(animated: Bool) {}
    func onPopped() {}
}

protocol AutoPlayHeaderProviding {
    @MainActor var barButtons: [NitroAction]? { get set }
}

@MainActor
func setBarButtons(template: CPTemplate, barButtons: [NitroAction]?) {
    guard let template = template as? CPBarButtonProviding else { return }

    if let headerActions = barButtons {
        let parsedActions = Parser.parseHeaderActions(
            headerActions: headerActions,
            traitCollection: SceneStore.getRootTraitCollection()
        )

        template.backButton = parsedActions.backButton
        template.leadingNavigationBarButtons =
            parsedActions.leadingNavigationBarButtons
        template.trailingNavigationBarButtons =
            parsedActions.trailingNavigationBarButtons
    }
}
