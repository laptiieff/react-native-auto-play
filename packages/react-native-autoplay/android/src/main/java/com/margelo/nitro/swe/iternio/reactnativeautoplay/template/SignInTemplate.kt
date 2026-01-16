package com.margelo.nitro.swe.iternio.reactnativeautoplay.template

import android.net.Uri
import androidx.car.app.CarContext
import androidx.car.app.model.ActionStrip
import androidx.car.app.model.InputCallback
import androidx.car.app.model.Template
import androidx.car.app.model.signin.InputSignInMethod
import androidx.car.app.model.signin.InputSignInMethod.INPUT_TYPE_DEFAULT
import androidx.car.app.model.signin.InputSignInMethod.INPUT_TYPE_PASSWORD
import androidx.car.app.model.signin.PinSignInMethod
import androidx.car.app.model.signin.QRCodeSignInMethod
import androidx.car.app.model.signin.SignInTemplate
import com.margelo.nitro.swe.iternio.reactnativeautoplay.KeyboardType
import com.margelo.nitro.swe.iternio.reactnativeautoplay.NitroAction
import com.margelo.nitro.swe.iternio.reactnativeautoplay.NitroActionType
import com.margelo.nitro.swe.iternio.reactnativeautoplay.SignInTemplateConfig
import com.margelo.nitro.swe.iternio.reactnativeautoplay.TextInputType
import java.security.InvalidParameterException

class SignInTemplate(
    context: CarContext, config: SignInTemplateConfig
) : AndroidAutoTemplate<SignInTemplateConfig>(context, config) {

    override val isRenderTemplate = false

    override val templateId: String
        get() = config.id

    override val autoDismissMs = config.autoDismissMs

    fun updateTemplate(config: SignInTemplateConfig) {
        config.signInMethod?.let {
            this.config = this.config.copy(signInMethod = config.signInMethod)
        }
        config.title?.let {
            this.config = this.config.copy(title = config.title)
        }
        config.headerActions?.let {
            this.config = this.config.copy(headerActions = config.headerActions)
        }
        config.actions?.let {
            this.config = this.config.copy(actions = config.actions)
        }
        config.description?.let {
            this.config = this.config.copy(description = config.description)
        }
        super.applyConfigUpdate()
    }

    override fun parse(): Template {
        val templateBuilder = config.signInMethod?.asFirstOrNull()?.let {
            val url = it.url
                ?: throw InvalidParameterException("missing url parameter")
            SignInTemplate.Builder(QRCodeSignInMethod(Uri.parse(url)))
        } ?: run {
            config.signInMethod?.asSecondOrNull()?.let {
                val pin = it.pin
                    ?: throw InvalidParameterException("missing pin parameter")
                SignInTemplate.Builder(PinSignInMethod(pin))
            } ?: run {
                config.signInMethod?.asThirdOrNull()?.let {
                    SignInTemplate.Builder(InputSignInMethod.Builder(object : InputCallback {
                        override fun onInputSubmitted(text: String) {
                            it.callback(text)
                        }
                    }).apply {
                        it.keyboardType?.let { kt ->
                            when (kt) {
                                KeyboardType.DEFAULT -> {
                                    InputSignInMethod.KEYBOARD_DEFAULT
                                }

                                KeyboardType.EMAIL -> {
                                    InputSignInMethod.KEYBOARD_EMAIL
                                }

                                KeyboardType.PHONE -> {
                                    InputSignInMethod.KEYBOARD_PHONE
                                }

                                KeyboardType.NUMBER -> {
                                    InputSignInMethod.KEYBOARD_NUMBER
                                }
                            }
                        }
                        when (it.inputType) {
                            TextInputType.DEFAULT -> {
                                setInputType(INPUT_TYPE_DEFAULT)
                            }
                            TextInputType.PASSWORD -> {
                                setInputType(INPUT_TYPE_PASSWORD)
                            }
                        }
                        it.hint?.let { hint ->
                            setHint(hint)
                        }
                        it.errorMessage?.let { error ->
                            setErrorMessage(error)
                        }
                        it.defaultValue?.let { default ->
                            setDefaultValue(default)
                        }
                        it.showKeyboardByDefault?.let { showKeyboard ->
                            setShowKeyboardByDefault(showKeyboard)
                        }
                    }.build())

                }
            }
        }

        if (templateBuilder == null) {
            throw InvalidParameterException("missing SignInTemplate builder")
        }

        return templateBuilder.apply {
            config.title?.let {
                setTitle(it)
            }
            config.description?.let {
                setAdditionalText(it)
            }
            config.headerActions?.let { headerActions ->
                headerActions.find { it.type == NitroActionType.BACK || it.type == NitroActionType.APPICON }
                    ?.let {
                        setHeaderAction(Parser.parseAction(context, it))
                    }
                val actionStripBuilder = ActionStrip.Builder()

                headerActions.filter { it.type == NitroActionType.CUSTOM }.forEach {
                    actionStripBuilder.addAction(Parser.parseAction(context, it))
                }
                setActionStrip(actionStripBuilder.build())

            }
            config.actions?.let {
                it.forEach { action ->
                    addAction(Parser.parseAction(context, action, true))
                }
            }
        }.build()
    }

    override fun setTemplateHeaderActions(headerActions: Array<NitroAction>?) {
        config = config.copy(headerActions = headerActions)
        super.applyConfigUpdate()
    }

    override fun onWillAppear() {
        config.onWillAppear?.let { it(null) }
    }

    override fun onWillDisappear() {
        config.onWillDisappear?.let { it(null) }
    }

    override fun onDidAppear() {
        config.onDidAppear?.let { it(null) }
    }

    override fun onDidDisappear() {
        config.onDidDisappear?.let { it(null) }
    }

    override fun onPopped() {
        config.onPopped?.let { it() }
        templates.remove(templateId)
    }
}