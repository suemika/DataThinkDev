import xml.etree.ElementTree as ET
import os

# 定义要检查的目录
targets_directory = 'F:\\imes\\Project\\trunk-PMS'

# 查找所有 .targets 文件
targets_files = [f for f in os.listdir(targets_directory) if f.endswith('.targets')]
print(f'在 {targets_directory} 中找到 {len(targets_files)} 个 .targets 文件。')
# 要检查的资源文件
resource_file = 'obj\\Debug\\iMES.Client.SD.FrmDeliverEdit.resources'

for targets_file in targets_files:
    try:
        tree = ET.parse(os.path.join(targets_directory, targets_file))
        root = tree.getroot()

        # 定义命名空间
        ns = {'msbuild': 'http://schemas.microsoft.com/developer/msbuild/2003'}

        # 查找所有可能添加资源的元素
        occurrences = root.findall(f'.//*[contains(text(), "{resource_file}")]', ns)
        if len(occurrences) > 1:
            print(f'在 {targets_file} 中发现重复添加 {resource_file} 的逻辑。')
    except Exception as e:
        print(f'处理 {targets_file} 时出错: {e}')