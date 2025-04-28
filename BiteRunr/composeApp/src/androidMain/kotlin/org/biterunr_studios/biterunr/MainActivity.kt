package org.biterunr_studios.biterunr

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import org.biterunr_studios.biterunr.Storage.PlatformSettingsFactory

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        platformSettingsFactory = PlatformSettingsFactory(applicationContext)

        setContent {
            App()
        }
    }

    companion object {
        lateinit var platformSettingsFactory: PlatformSettingsFactory
    }
}

@Preview
@Composable
fun AppAndroidPreview() {
    App()
}