  -- 1. Verifica os dados atuais do usuário (para debug)
  SELECT id, full_name, role, is_active FROM profiles WHERE id = '45a8bea6-9f79-41f9-8bbd-da9550cb6779';

  -- 2. CORREÇÃO: Força este usuário a ser um Motoboy ativo
  UPDATE profiles
  SET 
    role = 'motoboy',
    is_active = true
  WHERE id = '45a8bea6-9f79-41f9-8bbd-da9550cb6779';

  -- 3. Verifica novamente para confirmar
  SELECT id, full_name, role, is_active FROM profiles WHERE id = '45a8bea6-9f79-41f9-8bbd-da9550cb6779';
