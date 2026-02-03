package com.ifarma.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.rollbar.android.Rollbar;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Inicializar Rollbar para monitoramento de erros
        Rollbar.init(this);
        
        // Configurar ambiente (opcional)
        Rollbar.instance().configure(config -> {
            return config
                .environment("production")
                .codeVersion("1.0.0")
                .build();
        });
    }
}
