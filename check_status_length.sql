-- check_status_length.sql
select 
    name, 
    status, 
    length(status) as status_len,
    ascii(status) as status_ascii,
    is_featured
from pharmacies
order by status;
