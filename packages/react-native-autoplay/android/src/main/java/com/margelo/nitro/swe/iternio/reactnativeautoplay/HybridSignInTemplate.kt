package com.margelo.nitro.swe.iternio.reactnativeautoplay

import com.margelo.nitro.core.Promise
import com.margelo.nitro.swe.iternio.reactnativeautoplay.template.AndroidAutoTemplate
import com.margelo.nitro.swe.iternio.reactnativeautoplay.template.SignInTemplate

class HybridSignInTemplate : HybridSignInTemplateSpec() {
    override fun createSignInTemplate(config: SignInTemplateConfig) {
        val context = AndroidAutoSession.getRootContext()
            ?: throw IllegalArgumentException("createSignInTemplate failed, no carContext found")

        val template = SignInTemplate(context, config)
        AndroidAutoTemplate.setTemplate(config.id, template)
    }

    override fun updateTemplate(templateId: String, config: SignInTemplateConfig): Promise<Unit> {
        return Promise.async {
            val template = AndroidAutoTemplate.getTemplate<SignInTemplate>(templateId)
            template.updateTemplate(config)
        }
    }
}