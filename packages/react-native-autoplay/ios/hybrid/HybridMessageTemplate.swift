//
//  HybridMessageTemplate.swift
//  Pods
//
//  Created by Samuel Brucksch on 17.10.25.
//

class HybridMessageTemplate: HybridMessageTemplateSpec {
    func createMessageTemplate(config: MessageTemplateConfig) throws {
        let template = MessageTemplate(config: config)

        try RootModule.withScene { rootScene in
            rootScene.templateStore.addTemplate(
                template: template,
                templateId: config.id
            )
        }
    }
}
