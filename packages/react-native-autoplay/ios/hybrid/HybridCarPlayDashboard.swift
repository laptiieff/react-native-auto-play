//
//  HybridCarPlayDashboard.swift
//  Pods
//
//  Created by Manuel Auer on 24.10.25.
//
import NitroModules

class HybridCarPlayDashboard: HybridCarPlayDashboardSpec {
    private static var listeners = [EventName: [String: () -> Void]]()
    private static var colorSchemeListeners = [
        String: (_:ColorScheme) -> Void
    ]()

    func addListener(eventType: EventName, callback: @escaping () -> Void)
        throws -> () -> Void
    {
        let uuid = UUID().uuidString
        HybridCarPlayDashboard.listeners[eventType, default: [:]][uuid] =
            callback

        if eventType == .didconnect && SceneStore.isDashboardModuleConnected() {
            callback()
        }

        return {
            HybridCarPlayDashboard.listeners[eventType]?.removeValue(
                forKey: uuid
            )
        }
    }

    func initRootView() throws -> Promise<Void> {
        return Promise.async {
            guard let scene = SceneStore.getDashboardScene() else { return }
            try await MainActor.run {
                try scene.initRootView()
            }
        }
    }

    func setButtons(buttons: [NitroCarPlayDashboardButton]) throws -> Promise<
        Void
    > {
        return Promise.async {
            await MainActor.run {
                guard let scene = SceneStore.getDashboardScene() else { return }
                scene.setButtons(buttons: buttons)
            }
        }
    }

    func addListenerColorScheme(
        callback: @escaping (_ payload: ColorScheme) -> Void
    ) throws -> () -> Void {
        let uuid = UUID().uuidString
        HybridCarPlayDashboard.colorSchemeListeners[uuid] = callback

        return {
            HybridCarPlayDashboard.colorSchemeListeners.removeValue(
                forKey: uuid
            )
        }
    }

    static func emit(event: EventName) {
        HybridCarPlayDashboard.listeners[event]?.values.forEach {
            $0()
        }
    }

    static func emitColorScheme(colorScheme: ColorScheme) {
        HybridCarPlayDashboard.colorSchemeListeners.values.forEach {
            $0(colorScheme)
        }
    }
}
