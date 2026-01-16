package com.margelo.nitro.swe.iternio.reactnativeautoplay

import android.car.Car
import android.car.VehicleAreaType
import android.car.VehicleGear
import android.car.VehiclePropertyIds
import android.car.hardware.CarPropertyValue
import android.car.hardware.property.CarPropertyManager
import android.util.Log
import kotlin.math.floor

private val REQUIRED_VEHICLE_PROPERTY_IDS = listOf(
    //make sure all these ids are handled in vehiclePropertyReceiver
    VehiclePropertyIds.GEAR_SELECTION,
    VehiclePropertyIds.EV_BATTERY_LEVEL,
    VehiclePropertyIds.ENV_OUTSIDE_TEMPERATURE,
    VehiclePropertyIds.EV_CHARGE_PORT_CONNECTED,
    VehiclePropertyIds.EV_BATTERY_INSTANTANEOUS_CHARGE_RATE,
    VehiclePropertyIds.PERF_VEHICLE_SPEED,
    VehiclePropertyIds.PARKING_BRAKE_ON,
    VehiclePropertyIds.CURRENT_GEAR
)

private val TAG = "AndroidTelemetryObserver"

object AndroidTelemetryObserver : TelemetryObserver() {
    private val carContext = AndroidAutoSession.getCarContext(AndroidAutoSession.ROOT_SESSION)
    private var car = Car.createCar(carContext)

    private val batteryCapacity: Float

    init {
        val carPropertyManager = car.getCarManager(Car.PROPERTY_SERVICE) as CarPropertyManager

        val carManufacturer = carPropertyManager.getProperty<String>(
            VehiclePropertyIds.INFO_MAKE, VehicleAreaType.VEHICLE_AREA_TYPE_GLOBAL
        )?.value
        val carModel = carPropertyManager.getProperty<String>(
            VehiclePropertyIds.INFO_MODEL, VehicleAreaType.VEHICLE_AREA_TYPE_GLOBAL
        )?.value
        val carModelYear = carPropertyManager.getProperty<Int>(
            VehiclePropertyIds.INFO_MODEL_YEAR, VehicleAreaType.VEHICLE_AREA_TYPE_GLOBAL
        )?.value

        batteryCapacity = carPropertyManager.getProperty<Float>(
            VehiclePropertyIds.INFO_EV_BATTERY_CAPACITY, VehicleAreaType.VEHICLE_AREA_TYPE_GLOBAL
        )?.value ?: 0f

        telemetryHolder.updateVehicle(carModel, carManufacturer, carModelYear)
    }

    val vehiclePropertyReceiver = object : CarPropertyManager.CarPropertyEventCallback {
        override fun onChangeEvent(p0: CarPropertyValue<*>?) {
            try {
                if (p0?.status == CarPropertyValue.STATUS_AVAILABLE) {
                    when (p0.propertyId) {
                        VehiclePropertyIds.GEAR_SELECTION -> {
                            // this one reports only the basic gears like drive, park....
                            val selectedGear = getValue<Int>(p0)
                            telemetryHolder.updateSelectedGear(selectedGear)
                            // TODO: sendEvent("automotive_gear_changed", getIsDriving(newSelectedGear))
                        }

                        VehiclePropertyIds.CURRENT_GEAR -> {
                            // this one reports the detailed gear like first, second...
                            val currentGear = getValue<Int>(p0)
                            val selectedGear =
                                if (currentGear == VehicleGear.GEAR_PARK || currentGear == VehicleGear.GEAR_NEUTRAL || currentGear == VehicleGear.GEAR_REVERSE) {
                                    currentGear
                                } else {
                                    // we are not interested in the actual gear, like first, second...
                                    VehicleGear.GEAR_DRIVE
                                }
                            telemetryHolder.updateSelectedGear(selectedGear)
                            // TODO: sendEvent("automotive_gear_changed", getIsDriving(newSelectedGear))
                        }

                        VehiclePropertyIds.ENV_OUTSIDE_TEMPERATURE -> telemetryHolder.updateEnvOutsideTemperature(
                            getValue<Float>(p0)
                        )

                        VehiclePropertyIds.EV_CHARGE_PORT_CONNECTED -> telemetryHolder.updateEvChargePortConnected(
                            getValue<Boolean>(p0)
                        )

                        VehiclePropertyIds.EV_BATTERY_INSTANTANEOUS_CHARGE_RATE -> telemetryHolder.updateEvBatteryInstantaneousChargeRate(
                            -(getValue<Float>(p0)) / 1.0e6f
                        )

                        VehiclePropertyIds.EV_BATTERY_LEVEL -> {
                            if (batteryCapacity <= 0f) {
                                throw Exception("got invalid battery capacity $batteryCapacity")
                            }
                            val soc = getValue<Float>(p0) / batteryCapacity * 100
                            if (!soc.isFinite() || floor(soc) < 0 || floor(soc) > 100) {
                                throw Exception("got invalid soc $soc, expecting value from 0 to 100 EV_BATTERY_LEVEL: ${p0.value}, evBatteryCapacity: $batteryCapacity")
                            }
                            telemetryHolder.updateBatteryLevel(soc)
                        }

                        VehiclePropertyIds.PERF_VEHICLE_SPEED -> telemetryHolder.updateSpeed(
                            getValue<Float>(
                                p0
                            ) * 3.6f
                        )

                        VehiclePropertyIds.PARKING_BRAKE_ON -> telemetryHolder.updateParkingBrakeOn(
                            getValue<Boolean>(p0)
                        )

                        else -> throw Exception("received unimplemented property $p0")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "error processing telemetry value", e)
            }
        }

        override fun onErrorEvent(p0: Int, p1: Int) {

        }
    }

    override fun startTelemetryObserver(): Boolean {
        if (isObserverRunning) {
            // Android Automotive does not have single shot values in contrast to Android Auto
            return false
        }

        // create new instance so we can access all props after permissions were granted
        car.disconnect()
        car = Car.createCar(carContext)
        val carPropertyManager = car.getCarManager(Car.PROPERTY_SERVICE) as CarPropertyManager

        for (prop in REQUIRED_VEHICLE_PROPERTY_IDS) {
            val available = try {
                carPropertyManager.isPropertyAvailable(
                    prop, VehicleAreaType.VEHICLE_AREA_TYPE_GLOBAL
                )
            } catch (_: SecurityException) {
                false
            } catch (_: IllegalArgumentException) {
                false
            }

            if (available) {
                carPropertyManager.registerCallback(
                    vehiclePropertyReceiver, prop, CarPropertyManager.SENSOR_RATE_ONCHANGE
                )
            }
        }

        isObserverRunning = true
        return true
    }

    override fun stopTelemetryObserver() {
        val carPropertyManager = car.getCarManager(Car.PROPERTY_SERVICE) as CarPropertyManager
        carPropertyManager.unregisterCallback(vehiclePropertyReceiver)

        isObserverRunning = false
    }

    private inline fun <reified T> getValue(p0: CarPropertyValue<*>): T {
        return when (val value = p0.value) {
            is T -> value
            else -> throw Exception("Expected ${T::class.simpleName}, got $p0")
        }
    }
}