//
//  MessageTemplate.swift
//  Pods
//
//  Created by Samuel Brucksch on 17.10.25.
//

import CarPlay

class MessageTemplate: AutoPlayTemplate {
    let template: CPAlertTemplate
    var config: MessageTemplateConfig

    override var autoDismissMs: Double? {
        return config.autoDismissMs
    }

    override func getTemplate() -> CPTemplate {
        return template
    }

    init(config: MessageTemplateConfig) {
        self.config = config

        template = CPAlertTemplate(
            titleVariants: [Parser.parseText(text: config.message)!],
            actions: Parser.parseAlertActions(alertActions: config.actions),
            id: config.id
        )
    }

    override func onWillAppear(animated: Bool) {
        config.onWillAppear?(animated)
    }

    override func onDidAppear(animated: Bool) {
        config.onDidAppear?(animated)
    }

    override func onWillDisappear(animated: Bool) {
        config.onWillDisappear?(animated)
    }

    override func onDidDisappear(animated: Bool) {
        config.onDidDisappear?(animated)
    }

    override func onPopped() {
        config.onPopped?()
    }
}
